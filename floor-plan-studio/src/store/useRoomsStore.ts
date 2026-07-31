import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  ItemDimensionsIn,
  PlacedItem,
  Room,
  RoomLayout,
  SavedProduct,
  SpaceStyleOverride,
  StyleProfile,
  Unit,
  Wall,
} from '../types';
import * as db from '../lib/db';
import { FIXTURE_TYPE_TO_CATALOG_ID, FURNITURE_CATALOG, getCatalogItem } from '../data/furnitureCatalog';
import { extractStyleFromPhotos, type ImportedProduct } from '../lib/floorPlanAi';
import { snap } from '../lib/geometry';
import {
  clampToApartment,
  findNearestWall,
  getRoomLayout,
  nextDropSpotInSpace,
  pointInPolygon,
  polygonArea,
  projectPointOntoWall,
  fixtureFacingToRotationY,
  wallInwardSign,
  wallSegmentPosition,
  type RawFixture,
  type ResolvedDoor,
} from '../lib/floorPlan';

interface NewRoomInput {
  name: string;
  unit: Unit;
  dimensions?: Room['dimensions'];
  layout?: RoomLayout;
  ceilingHeightIn?: number;
  floorPlanFile?: File;
  photoFiles: File[];
  /** Openings detected from the floor plan, pre-resolved onto walls — saved as doorway items so
   * a freshly-traced apartment is walkable immediately instead of being a set of sealed boxes. */
  doors?: ResolvedDoor[];
  /** Windows detected from the floor plan, saved as glass openings in their exterior walls. */
  windows?: ResolvedDoor[];
  /** Built-in fixtures (counters, island, toilets, tubs…) detected on the floor plan. */
  fixtures?: RawFixture[];
  /** Real-apartment finishes extracted from the user's photos. */
  styleProfile?: StyleProfile;
}

interface RoomsState {
  rooms: Room[];
  roomsLoaded: boolean;
  imageUrls: Record<string, string>;

  currentRoom: Room | null;
  currentLayout: RoomLayout;
  placedItems: PlacedItem[];
  /** undo/redo stacks — snapshots of placedItems taken before each mutation */
  itemHistory: EditSnapshot[];
  itemFuture: EditSnapshot[];
  selectedItemId: string | null;
  activeSpaceId: string | null;
  cameraMode: 'orbit' | 'walk';
  gridSnap: boolean;
  showReferenceDrawer: boolean;

  loadRooms: () => Promise<void>;
  createRoom: (input: NewRoomInput) => Promise<string>;
  deleteRoom: (id: string) => Promise<void>;

  loadRoomEditor: (roomId: string) => Promise<void>;
  /** Runs AI style extraction on the current room's photos and saves the result. Throws with a
   * user-readable message on failure (no photos, AI server down, etc.). */
  matchStyleFromPhotos: () => Promise<void>;
  setActiveSpace: (spaceId: string) => void;
  addPlacedItem: (catalogItemId: string) => string | undefined;
  /** Products imported from store URLs, available in the furniture bar across all rooms. */
  savedProducts: SavedProduct[];
  loadSavedProducts: () => Promise<void>;
  /** Saves an imported product to the catalog. Does NOT place it — the user picks where. */
  saveImportedProduct: (p: ImportedProduct) => Promise<SavedProduct>;
  removeSavedProduct: (id: string) => Promise<void>;
  /** Places a previously-saved product into the active room. */
  placeSavedProduct: (productId: string) => string | undefined;
  /** Updates in-memory state only, for smooth live-dragging without hammering IndexedDB. */
  updatePlacedItemLocal: (id: string, patch: Partial<PlacedItem>) => void;
  updatePlacedItem: (id: string, patch: Partial<PlacedItem>) => void;
  setItemDimensions: (id: string, dims: ItemDimensionsIn) => void;
  mountOnWall: (id: string, wallId: string, heightOffsetIn?: number) => void;
  mountOnNearestWall: (id: string) => void;
  unmountFromWall: (id: string) => void;
  duplicatePlacedItem: (id: string) => void;
  removePlacedItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  /** Capture an undo snapshot at the START of a drag/rotate gesture (the commit at the end
   * would otherwise snapshot the already-moved state). */
  beginItemMutation: () => void;
  undoItems: () => void;
  redoItems: () => void;
  /** Delete a wall from the current layout. Undoable via undoItems(). */
  removeWall: (wallId: string) => void;
  /** Set or clear (patch = null) a per-space wall/floor override on the current room. */
  updateSpaceStyle: (spaceId: string, patch: SpaceStyleOverride | null) => void;
  setCameraMode: (mode: 'orbit' | 'walk') => void;
  toggleGridSnap: () => void;
  toggleReferenceDrawer: () => void;
  resetRoomLayout: () => Promise<void>;
}

async function ensureImageUrl(id: string | undefined, cache: Record<string, string>): Promise<Record<string, string>> {
  if (!id || cache[id]) return cache;
  const blob = await db.getImage(id);
  if (!blob) return cache;
  return { ...cache, [id]: URL.createObjectURL(blob) };
}

const EMPTY_LAYOUT: RoomLayout = { spaces: [], walls: [] };

/**
 * One undoable edit. Walls ride along with items because removing a wall and moving a sofa share
 * the same undo button — a history that only remembered items would silently skip past wall edits.
 */
type EditSnapshot = { items: PlacedItem[]; walls: Wall[] };

function snapshotNow(state: { placedItems: PlacedItem[]; currentLayout: RoomLayout }): EditSnapshot {
  return {
    items: state.placedItems.map((it) => ({ ...it })),
    walls: state.currentLayout.walls.map((w) => ({ ...w })),
  };
}

/** Persists an undo/redo restore: saves every item in the restored set, deletes items that were
 * present before but aren't anymore. */
async function persistItemsDiff(before: PlacedItem[], after: PlacedItem[]): Promise<void> {
  const afterIds = new Set(after.map((it) => it.id));
  await Promise.all([
    ...after.map((it) => db.savePlacedItem(it)),
    ...before.filter((it) => !afterIds.has(it.id)).map((it) => db.deletePlacedItem(it.id)),
  ]);
}

/** Writes a layout back to the room record so wall edits survive a reload. */
async function persistLayout(room: Room | null, layout: RoomLayout): Promise<void> {
  if (!room) return;
  const updated: Room = { ...room, layout };
  useRoomsStore.setState({ currentRoom: updated });
  await db.saveRoom(updated);
}

/** State patch that puts a snapshot back on screen. */
function restoreSnapshot(state: { currentLayout: RoomLayout }, snap: EditSnapshot) {
  return {
    placedItems: snap.items,
    currentLayout: { ...state.currentLayout, walls: snap.walls },
    selectedItemId: null as string | null,
  };
}

/**
 * Persists a restored snapshot: item diff plus the layout, since walls are undoable too.
 *
 * `itemsBefore` is the pre-restore item set (needed to know what to delete), but the room and
 * layout are read live — the caller's captured state is already stale by the time this runs.
 */
async function persistSnapshot(itemsBefore: PlacedItem[], snap: EditSnapshot): Promise<void> {
  // Layout first: it is a single small write, and queueing it behind a bulk item diff left a
  // window where a reload restored the pre-undo walls.
  const { currentRoom, currentLayout } = useRoomsStore.getState();
  await persistLayout(currentRoom, { ...currentLayout, walls: snap.walls });
  await persistItemsDiff(itemsBefore, snap.items);
}

/** True between beginItemMutation() (drag start) and the commit's updatePlacedItem — stops the
 * commit from pushing a second, post-move snapshot. */
let dragSnapshotActive = false;

function pushItemHistory() {
  useRoomsStore.setState((state) => ({
    itemHistory: [...state.itemHistory.slice(-49), snapshotNow(state)],
    itemFuture: [],
  }));
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  roomsLoaded: false,
  imageUrls: {},

  currentRoom: null,
  currentLayout: EMPTY_LAYOUT,
  placedItems: [],
  savedProducts: [],
  itemHistory: [],
  itemFuture: [],
  selectedItemId: null,
  activeSpaceId: null,
  cameraMode: 'orbit',
  gridSnap: true,
  showReferenceDrawer: false,

  loadRooms: async () => {
    const rooms = await db.listRooms();
    let cache = get().imageUrls;
    for (const room of rooms) {
      cache = await ensureImageUrl(room.photoIds[0] ?? room.floorPlanImageId, cache);
    }
    set({ rooms, roomsLoaded: true, imageUrls: cache });
  },

  createRoom: async (input) => {
    const id = uuid();
    let floorPlanImageId: string | undefined;
    if (input.floorPlanFile) {
      floorPlanImageId = uuid();
      await db.saveImage(floorPlanImageId, input.floorPlanFile);
    }
    const photoIds: string[] = [];
    for (const file of input.photoFiles) {
      const photoId = uuid();
      await db.saveImage(photoId, file);
      photoIds.push(photoId);
    }
    const room: Room = {
      id,
      name: input.name,
      unit: input.unit,
      dimensions: input.dimensions,
      layout: input.layout,
      ceilingHeightIn: input.ceilingHeightIn,
      floorPlanImageId,
      photoIds,
      styleProfile: input.styleProfile,
      createdAt: Date.now(),
    };
    await db.saveRoom(room);

    // Persist detected openings (doors + windows) as wall-cutting items, flush in their wall.
    const placeOpening = async (catalogId: string, opening: ResolvedDoor, heightOffsetIn: number, heightIn: number) => {
      const catalog = getCatalogItem(catalogId);
      const wall = input.layout?.walls.find((w) => w.id === opening.wallId);
      if (!catalog || !wall) return;
      const space = input.layout!.spaces.find((s) => s.id === wall.spaceIds[0]);
      const inward = space ? wallInwardSign(wall, space) : 1;
      const pos = wallSegmentPosition(wall, opening.offsetIn, 0, inward);
      await db.savePlacedItem({
        id: uuid(),
        roomId: id,
        catalogItemId: catalog.id,
        x: pos.x,
        z: pos.z,
        rotationY: pos.rotationY,
        color: catalog.color,
        customDimensions: { ...catalog.defaultDimensions, widthIn: opening.widthIn, heightIn },
        wallMounted: { wallId: wall.id, offsetIn: opening.offsetIn, heightOffsetIn },
      });
    };

    const doorCatalog = getCatalogItem('doorway');
    for (const door of input.doors ?? []) {
      const h = doorCatalog?.defaultDimensions.heightIn ?? 80;
      await placeOpening('doorway', door, h / 2, h);
    }

    // Window vertical band comes from the extracted style (0 sill = floor-to-ceiling glass).
    const ceiling = input.ceilingHeightIn ?? 96;
    const sillIn = Math.max(0, input.styleProfile?.windowSillIn ?? 24);
    const headIn = Math.min(Math.max(input.styleProfile?.windowHeadIn ?? 90, sillIn + 24), ceiling - 2);
    for (const win of input.windows ?? []) {
      await placeOpening('window', win, (sillIn + headIn) / 2, headIn - sillIn);
    }

    // Built-in fixtures from the plan (counters, island, toilets, tubs…), placed exactly where
    // they're drawn. The AI reports image-axis extents; for left/right-facing fixtures the
    // item's own width axis runs along image-Y, so swap.
    for (const fixture of input.fixtures ?? []) {
      const catalogId = FIXTURE_TYPE_TO_CATALOG_ID[fixture.type];
      const catalog = catalogId ? getCatalogItem(catalogId) : undefined;
      if (!catalog) continue;
      const sideways = fixture.facing === 'left' || fixture.facing === 'right';
      const widthIn = sideways ? fixture.depthIn : fixture.widthIn;
      const depthIn = sideways ? fixture.widthIn : fixture.depthIn;
      await db.savePlacedItem({
        id: uuid(),
        roomId: id,
        catalogItemId: catalog.id,
        x: fixture.center.x,
        z: fixture.center.z,
        rotationY: fixtureFacingToRotationY(fixture.facing),
        color: catalog.color,
        customDimensions: { widthIn, depthIn, heightIn: catalog.defaultDimensions.heightIn },
      });
    }

    await get().loadRooms();
    return id;
  },

  deleteRoom: async (id) => {
    await db.deleteRoom(id);
    await get().loadRooms();
  },

  matchStyleFromPhotos: async () => {
    const room = get().currentRoom;
    if (!room) throw new Error('No room open.');
    if (room.photoIds.length === 0) throw new Error('This room has no photos — add some on the room, then retry.');
    const blobs: Blob[] = [];
    for (const photoId of room.photoIds) {
      const blob = await db.getImage(photoId);
      if (blob) blobs.push(blob);
    }
    if (blobs.length === 0) throw new Error('Could not load this room’s photos.');
    const styleProfile = await extractStyleFromPhotos(blobs);
    const updated: Room = { ...room, styleProfile };
    await db.saveRoom(updated);
    set({ currentRoom: updated });
    await get().loadRooms();
  },

  loadRoomEditor: async (roomId) => {
    const room = await db.getRoom(roomId);
    if (!room) {
      set({ currentRoom: null, currentLayout: EMPTY_LAYOUT, placedItems: [], activeSpaceId: null });
      return;
    }
    const items = await db.listPlacedItems(roomId);
    let cache = get().imageUrls;
    cache = await ensureImageUrl(room.floorPlanImageId, cache);
    for (const photoId of room.photoIds) {
      cache = await ensureImageUrl(photoId, cache);
    }
    const layout = getRoomLayout(room);
    const defaultSpace = [...layout.spaces].sort((a, b) => polygonArea(b.polygon) - polygonArea(a.polygon))[0];
    set({
      currentRoom: room,
      currentLayout: layout,
      placedItems: items,
      itemHistory: [],
      itemFuture: [],
      selectedItemId: null,
      activeSpaceId: defaultSpace?.id ?? null,
      imageUrls: cache,
    });
  },

  setActiveSpace: (spaceId) => set({ activeSpaceId: spaceId }),

  addPlacedItem: (catalogItemId) => {
    const { currentRoom: room, currentLayout: layout, activeSpaceId, placedItems } = get();
    const catalog = getCatalogItem(catalogItemId);
    if (!room || !catalog || layout.spaces.length === 0) return undefined;

    const space = layout.spaces.find((s) => s.id === activeSpaceId) ?? layout.spaces[0];
    const countInSpace = placedItems.filter((it) => pointInPolygon({ x: it.x, z: it.z }, space.polygon)).length;
    const spot = nextDropSpotInSpace(space, countInSpace);
    const { x, z } = clampToApartment(layout, spot.x, spot.z, catalog.defaultDimensions, 0);

    const item: PlacedItem = {
      id: uuid(),
      roomId: room.id,
      catalogItemId,
      x,
      z,
      rotationY: 0,
      color: catalog.color,
    };

    if (catalog.defaultWallMounted) {
      const wallsInSpace = layout.walls.filter((w) => w.spaceIds.includes(space.id));
      const wall = findNearestWall(wallsInSpace.length ? wallsInSpace : layout.walls, { x, z });
      if (wall) {
        const offsetIn = projectPointOntoWall(wall, { x, z });
        const inward = wallInwardSign(wall, space);
        // Clear the wall's own thickness so the item sits on its interior face, not inside it.
        const insetIn = wall.thicknessIn / 2 + catalog.defaultDimensions.depthIn / 2;
        const pos = wallSegmentPosition(wall, offsetIn, insetIn, inward);
        item.x = pos.x;
        item.z = pos.z;
        item.rotationY = pos.rotationY;
        // Doorways sit on the floor (center = half their height); decor/windows hang at a fixed height.
        const heightOffsetIn = catalog.cutsWall ? catalog.defaultDimensions.heightIn / 2 : 48;
        item.wallMounted = { wallId: wall.id, offsetIn, heightOffsetIn };
      }
    }

    pushItemHistory();
    set((state) => ({ placedItems: [...state.placedItems, item], selectedItemId: item.id }));
    void db.savePlacedItem(item);
    return item.id;
  },

  loadSavedProducts: async () => {
    set({ savedProducts: await db.listSavedProducts() });
  },

  saveImportedProduct: async (p) => {
    const product: SavedProduct = {
      id: uuid(),
      name: p.name,
      shape: p.shape as SavedProduct['shape'],
      category: p.category as SavedProduct['category'],
      dimensions: { widthIn: p.widthIn, depthIn: p.depthIn, heightIn: p.heightIn },
      colorHex: p.colorHex,
      wallMounted: p.wallMounted,
      dimensionsFound: p.dimensionsFound,
      sourceUrl: p.sourceUrl,
      imageDataUrl: p.imageDataUrl ?? undefined,
      createdAt: Date.now(),
    };
    await db.saveProduct(product);
    set((state) => ({ savedProducts: [...state.savedProducts, product] }));
    return product;
  },

  removeSavedProduct: async (id) => {
    await db.deleteSavedProduct(id);
    set((state) => ({ savedProducts: state.savedProducts.filter((p) => p.id !== id) }));
  },

  placeSavedProduct: (productId) => {
    const { currentRoom: room, currentLayout: layout, activeSpaceId, placedItems, savedProducts } = get();
    const p = savedProducts.find((s) => s.id === productId);
    if (!room || !p || layout.spaces.length === 0) return undefined;

    // Render using whichever catalog entry has the matching silhouette; the real dimensions and
    // colour from the listing then override that template's defaults.
    const template = FURNITURE_CATALOG.find((c) => c.geometry.kind === p.shape) ?? getCatalogItem('bookshelf');
    if (!template) return undefined;

    const space = layout.spaces.find((s) => s.id === activeSpaceId) ?? layout.spaces[0];
    const countInSpace = placedItems.filter((it) => pointInPolygon({ x: it.x, z: it.z }, space.polygon)).length;
    const spot = nextDropSpotInSpace(space, countInSpace);
    const dims = p.dimensions;
    const { x, z } = clampToApartment(layout, spot.x, spot.z, dims, 0);

    const item: PlacedItem = {
      id: uuid(),
      roomId: room.id,
      catalogItemId: template.id,
      x,
      z,
      rotationY: 0,
      color: p.colorHex,
      customDimensions: dims,
      product: {
        name: p.name,
        sourceUrl: p.sourceUrl,
        imageDataUrl: p.imageDataUrl,
        dimensionsFound: p.dimensionsFound,
      },
    };

    if (p.wallMounted) {
      const wallsInSpace = layout.walls.filter((w) => w.spaceIds.includes(space.id));
      const wall = findNearestWall(wallsInSpace.length ? wallsInSpace : layout.walls, { x, z });
      if (wall) {
        const offsetIn = projectPointOntoWall(wall, { x, z });
        const inward = wallInwardSign(wall, space);
        const pos = wallSegmentPosition(wall, offsetIn, wall.thicknessIn / 2 + dims.depthIn / 2, inward);
        item.x = pos.x;
        item.z = pos.z;
        item.rotationY = pos.rotationY;
        item.wallMounted = { wallId: wall.id, offsetIn, heightOffsetIn: 48 };
      }
    }

    pushItemHistory();
    set((state) => ({ placedItems: [...state.placedItems, item], selectedItemId: item.id }));
    void db.savePlacedItem(item);
    return item.id;
  },

  updatePlacedItemLocal: (id, patch) => {
    set((state) => ({
      placedItems: state.placedItems.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  },

  updatePlacedItem: (id, patch) => {
    if (dragSnapshotActive) dragSnapshotActive = false;
    else pushItemHistory();
    get().updatePlacedItemLocal(id, patch);
    const item = get().placedItems.find((it) => it.id === id);
    if (item) void db.savePlacedItem(item);
  },

  setItemDimensions: (id, dims) => {
    get().updatePlacedItem(id, { customDimensions: dims });
  },

  mountOnWall: (id, wallId, heightOffsetIn) => {
    const { currentLayout: layout, placedItems } = get();
    const item = placedItems.find((it) => it.id === id);
    const wall = layout.walls.find((w) => w.id === wallId);
    if (!item || !wall) return;
    const catalog = getCatalogItem(item.catalogItemId);
    const dims = item.customDimensions ?? catalog?.defaultDimensions;
    const space = layout.spaces.find((s) => s.id === wall.spaceIds[0]);
    const inward = space ? wallInwardSign(wall, space) : 1;
    const offsetIn = projectPointOntoWall(wall, { x: item.x, z: item.z });
    // Openings sit inside the wall; everything else sits on its interior face.
    const insetIn = catalog?.cutsWall ? 0 : wall.thicknessIn / 2 + (dims?.depthIn ?? 0) / 2;
    const pos = wallSegmentPosition(wall, offsetIn, insetIn, inward);
    const defaultHeightOffsetIn = catalog?.cutsWall ? (dims?.heightIn ?? 0) / 2 : 48;
    get().updatePlacedItem(id, {
      x: pos.x,
      z: pos.z,
      rotationY: pos.rotationY,
      wallMounted: {
        wallId,
        offsetIn,
        heightOffsetIn: heightOffsetIn ?? item.wallMounted?.heightOffsetIn ?? defaultHeightOffsetIn,
      },
      customDimensions: dims,
    });
  },

  mountOnNearestWall: (id) => {
    const { currentLayout: layout, placedItems } = get();
    const item = placedItems.find((it) => it.id === id);
    if (!item) return;
    const wall = findNearestWall(layout.walls, { x: item.x, z: item.z });
    if (wall) get().mountOnWall(id, wall.id);
  },

  unmountFromWall: (id) => {
    get().updatePlacedItem(id, { wallMounted: undefined });
  },

  duplicatePlacedItem: (id) => {
    const item = get().placedItems.find((it) => it.id === id);
    if (!item) return;
    const newItem: PlacedItem = {
      ...item,
      id: uuid(),
      x: snap(item.x + 12),
      z: snap(item.z + 12),
    };
    pushItemHistory();
    set((state) => ({ placedItems: [...state.placedItems, newItem], selectedItemId: newItem.id }));
    void db.savePlacedItem(newItem);
  },

  removePlacedItem: (id) => {
    pushItemHistory();
    set((state) => ({
      placedItems: state.placedItems.filter((it) => it.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    }));
    void db.deletePlacedItem(id);
  },

  selectItem: (id) => {
    // Selecting something in a room also makes that the active room, so the next item you add
    // (especially a doorway/window) appears where you're working rather than in whichever room
    // happened to be selected in the sidebar.
    const { placedItems, currentLayout } = get();
    const item = id ? placedItems.find((it) => it.id === id) : undefined;
    if (item) {
      const space = currentLayout.spaces.find((s) => pointInPolygon({ x: item.x, z: item.z }, s.polygon));
      if (space) {
        set({ selectedItemId: id, activeSpaceId: space.id });
        return;
      }
    }
    set({ selectedItemId: id });
  },

  beginItemMutation: () => {
    if (dragSnapshotActive) return;
    pushItemHistory();
    dragSnapshotActive = true;
  },

  undoItems: () => {
    const state = get();
    const previous = state.itemHistory[state.itemHistory.length - 1];
    if (!previous) return;
    const current = snapshotNow(state);
    set({
      ...restoreSnapshot(state, previous),
      itemHistory: state.itemHistory.slice(0, -1),
      itemFuture: [...state.itemFuture, current],
    });
    void persistSnapshot(state.placedItems, previous);
  },

  redoItems: () => {
    const state = get();
    const next = state.itemFuture[state.itemFuture.length - 1];
    if (!next) return;
    const current = snapshotNow(state);
    set({
      ...restoreSnapshot(state, next),
      itemFuture: state.itemFuture.slice(0, -1),
      itemHistory: [...state.itemHistory, current],
    });
    void persistSnapshot(state.placedItems, next);
  },

  removeWall: (wallId) => {
    const { currentLayout } = get();
    if (!currentLayout.walls.some((w) => w.id === wallId)) return;
    pushItemHistory();
    const layout: RoomLayout = {
      ...currentLayout,
      walls: currentLayout.walls.filter((w) => w.id !== wallId),
    };
    set({ currentLayout: layout });
    void persistLayout(get().currentRoom, layout);
  },

  updateSpaceStyle: (spaceId, patch) => {
    const room = get().currentRoom;
    if (!room) return;
    const spaceStyles = { ...(room.spaceStyles ?? {}) };
    if (patch === null) delete spaceStyles[spaceId];
    else spaceStyles[spaceId] = { ...spaceStyles[spaceId], ...patch };
    const updated: Room = { ...room, spaceStyles };
    set({ currentRoom: updated });
    void db.saveRoom(updated);
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
  toggleReferenceDrawer: () => set((state) => ({ showReferenceDrawer: !state.showReferenceDrawer })),

  resetRoomLayout: async () => {
    pushItemHistory();
    const items = get().placedItems;
    await Promise.all(items.map((it) => db.deletePlacedItem(it.id)));
    set({ placedItems: [], selectedItemId: null });
  },
}));

// Dev-only handle so browser-driven tests can assert on real store state instead of pixels.
// Stripped from production builds by the bundler's dead-code elimination.
if (import.meta.env.DEV) {
  (window as unknown as { __store?: unknown }).__store = useRoomsStore;
}
