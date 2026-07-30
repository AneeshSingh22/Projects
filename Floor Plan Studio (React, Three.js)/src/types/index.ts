export type Unit = 'ft' | 'm';

export interface RoomDimensions {
  /** left-right extent, in the room's unit */
  width: number;
  /** front-back extent, in the room's unit */
  length: number;
  height: number;
}

/** Apartment-global 2D point, in inches, on the floor plane (x = width axis, z = depth axis). */
export interface Point2D {
  x: number;
  z: number;
}

/** A straight wall segment. Shared walls between two traced rooms list both space ids. */
export interface Wall {
  id: string;
  a: Point2D;
  b: Point2D;
  thicknessIn: number;
  /** 1 id = exterior wall, 2 ids = shared interior wall between those spaces */
  spaceIds: string[];
}

/** One named, walkable room within a traced apartment layout. */
export interface RoomSpace {
  id: string;
  name: string;
  /** ordered polygon vertices, apartment-global inches */
  polygon: Point2D[];
}

/** A traced multi-room apartment shape, as an alternative to the simple rectangular `dimensions`. */
export interface RoomLayout {
  spaces: RoomSpace[];
  walls: Wall[];
}

/** Visual finishes of the real apartment, extracted from the user's room photos by AI (or the
 * built-in default). Drives the 3D scene's floor texture, wall paint, trim, and window styling
 * so the model reads as *their* unit rather than a generic beige diagram. */
export interface StyleProfile {
  floor: {
    material: 'wood' | 'tile' | 'carpet' | 'concrete';
    /** dominant color of the flooring, e.g. the average plank tone */
    colorHex: string;
    /** secondary tone for plank/tile variation; defaults derived from colorHex when absent */
    accentHex?: string;
  };
  wallHex: string;
  baseboardHex: string;
  baseboardHeightIn: number;
  windowFrameHex: string;
  /** typical window band for this unit; sill 0 = floor-to-ceiling glass */
  windowSillIn: number;
  windowHeadIn: number;
}

export interface Room {
  id: string;
  name: string;
  unit: Unit;
  /** simple rectangular room (the "quick room" flow). Absent when `layout` is set. */
  dimensions?: RoomDimensions;
  /** present for rooms traced from a floor plan image; when set, takes priority over `dimensions` */
  layout?: RoomLayout;
  /** apartment-wide ceiling height in inches, used only when `layout` is set (traced rooms store everything in inches already) */
  ceilingHeightIn?: number;
  floorPlanImageId?: string;
  photoIds: string[];
  /** real-apartment finishes extracted from photos; absent = default styling */
  styleProfile?: StyleProfile;
  /** per-space overrides of wall paint / flooring, keyed by RoomSpace id — the "design" layer
   * on top of the apartment-wide styleProfile */
  spaceStyles?: Record<string, SpaceStyleOverride>;
  createdAt: number;
}

export interface SpaceStyleOverride {
  wallHex?: string;
  floor?: StyleProfile['floor'];
}

export interface WallMount {
  wallId: string;
  /** position along the wall from its `a` endpoint, in inches */
  offsetIn: number;
  /** height of the item's center off the floor, in inches */
  heightOffsetIn: number;
}

/** Exact real-world size of a placed item, always stored in inches */
export interface ItemDimensionsIn {
  widthIn: number;
  depthIn: number;
  heightIn: number;
  /** for TVs: the diagonal screen size that produced width/height */
  diagonalIn?: number;
}

/** A real product imported from a store URL — rendered using the closest built-in shape, sized to
 * the product's actual dimensions, with its photo shown in the side panel. */
/** A product imported from a store URL and saved to the user's catalog, so it can be placed
 * repeatedly like any built-in item. Persisted in IndexedDB. */
export interface SavedProduct {
  id: string;
  /** user-facing label, e.g. "IKEA KIVIK 3-Seat Sofa" */
  name: string;
  /** which built-in geometry renders it */
  shape: GeometryRecipe['kind'];
  category: FurnitureCategory;
  dimensions: ItemDimensionsIn;
  colorHex: string;
  wallMounted: boolean;
  dimensionsFound: boolean;
  sourceUrl: string;
  imageDataUrl?: string;
  createdAt: number;
}

export interface ProductInfo {
  name: string;
  sourceUrl: string;
  /** product photo as a data URL, so it survives offline and needs no hotlinking */
  imageDataUrl?: string;
  /** false when the AI estimated dimensions rather than reading them off the page */
  dimensionsFound: boolean;
}

export interface PlacedItem {
  id: string;
  roomId: string;
  catalogItemId: string;
  /** set when this item came from a pasted product URL rather than the built-in catalog */
  product?: ProductInfo;
  /** position of the item's center on the floor plane, in inches, apartment-global coordinates */
  x: number;
  z: number;
  rotationY: number;
  customDimensions?: ItemDimensionsIn;
  color?: string;
  wallMounted?: WallMount;
}

export type FurnitureCategory =
  | 'seating'
  | 'tables'
  | 'storage'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'decor'
  | 'electronics'
  | 'openings';

export type GeometryRecipe =
  | { kind: 'sofa' }
  | { kind: 'armchair' }
  | { kind: 'coffeeTable' }
  | { kind: 'sideTable' }
  | { kind: 'diningTable' }
  | { kind: 'desk' }
  | { kind: 'chair' }
  | { kind: 'bookshelf' }
  | { kind: 'dresser' }
  | { kind: 'nightstand' }
  | { kind: 'bed' }
  | { kind: 'rug' }
  | { kind: 'lamp' }
  | { kind: 'plant' }
  | { kind: 'tv' }
  | { kind: 'tvStand' }
  | { kind: 'painting' }
  | { kind: 'window' }
  | { kind: 'doorway' }
  | { kind: 'kitchenCounter' }
  | { kind: 'kitchenIsland' }
  | { kind: 'fridge' }
  | { kind: 'stove' }
  | { kind: 'toilet' }
  | { kind: 'vanity' }
  | { kind: 'bathtub' }
  | { kind: 'shower' }
  | { kind: 'washerDryer' }
  | { kind: 'box' };

export type SizeInputMode = 'wdh' | 'tv-diagonal';

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  defaultDimensions: ItemDimensionsIn;
  color: string;
  geometry: GeometryRecipe;
  sizeInputMode: SizeInputMode;
  /** true for items that default to being mounted flat on a wall (art, shelves) */
  defaultWallMounted?: boolean;
  /** true for doorways: carves a gap in the wall's geometry instead of just decorating its surface */
  cutsWall?: boolean;
}
