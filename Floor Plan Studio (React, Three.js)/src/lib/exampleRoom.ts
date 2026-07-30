import { v4 as uuid } from 'uuid';
import exampleData from '../data/exampleApartment.json';
import type { PlacedItem, Room } from '../types';
import * as db from './db';
import { FIXTURE_TYPE_TO_CATALOG_ID, getCatalogItem } from '../data/furnitureCatalog';
import {
  dedupeWalls,
  fixtureFacingToRotationY,
  resolveDoorsToWalls,
  wallInwardSign,
  wallSegmentPosition,
  type RawDoor,
  type RawFixture,
  type RawTracedSpace,
  type ResolvedDoor,
} from './floorPlan';

const SEEDED_FLAG = 'example-apartment-seeded';
const CEILING_HEIGHT_IN = 108;
/** Openings this wide read as open-plan boundaries; dedupeWalls dissolves the wall entirely. */
const OPEN_BOUNDARY_MIN_WIDTH_IN = 72;

interface ExampleData {
  spaces: RawTracedSpace[];
  doors: RawDoor[];
  windows: RawDoor[];
  fixtures: RawFixture[];
}

/**
 * Seeds a ready-made example apartment the first time someone opens the app.
 *
 * This is the "just let me try it" path: a real traced 2-bedroom with working doors, windows and
 * built-in kitchen/bath fixtures, but no loose furniture — so a visitor lands in a believable empty
 * apartment and can immediately start placing things. Derived offline from a verified AI trace, so
 * it needs no API key and costs nothing to load.
 *
 * Runs once per browser. If the user deletes it, it stays deleted.
 */
let seedInFlight: Promise<void> | null = null;

export function seedExampleRoomIfNeeded(): Promise<void> {
  // React StrictMode runs effects twice in development, and the localStorage flag isn't set until
  // seeding finishes — so without this in-flight guard both calls pass the check and the example
  // gets created twice.
  if (!seedInFlight) seedInFlight = doSeed();
  return seedInFlight;
}

async function doSeed(): Promise<void> {
  try {
    if (localStorage.getItem(SEEDED_FLAG)) return;
  } catch {
    return; // storage unavailable — skip seeding rather than reseeding on every load
  }

  const existing = await db.listRooms();
  if (existing.length > 0) {
    // Someone already has their own rooms; don't clutter their dashboard.
    try {
      localStorage.setItem(SEEDED_FLAG, '1');
    } catch {
      /* ignore */
    }
    return;
  }

  const data = exampleData as ExampleData;
  const spaces: RawTracedSpace[] = data.spaces.map((s, i) => ({ ...s, id: s.id ?? `space-${i}` }));
  const walls = dedupeWalls(spaces, undefined, data.doors);

  const roomId = uuid();
  const room: Room = {
    id: roomId,
    name: 'Example Apartment',
    unit: 'ft',
    layout: { spaces, walls },
    ceilingHeightIn: CEILING_HEIGHT_IN,
    photoIds: [],
    createdAt: Date.now(),
  };
  await db.saveRoom(room);

  const placeOpening = async (catalogId: string, o: ResolvedDoor, heightOffsetIn: number, heightIn: number) => {
    const catalog = getCatalogItem(catalogId);
    const wall = walls.find((w) => w.id === o.wallId);
    if (!catalog || !wall) return;
    const space = spaces.find((s) => s.id === wall.spaceIds[0]);
    const inward = space ? wallInwardSign(wall, { id: space.id, name: space.name, polygon: space.polygon }) : 1;
    const pos = wallSegmentPosition(wall, o.offsetIn, 0, inward);
    await db.savePlacedItem({
      id: uuid(),
      roomId,
      catalogItemId: catalog.id,
      x: pos.x,
      z: pos.z,
      rotationY: pos.rotationY,
      color: catalog.color,
      customDimensions: { ...catalog.defaultDimensions, widthIn: o.widthIn, heightIn },
      wallMounted: { wallId: wall.id, offsetIn: o.offsetIn, heightOffsetIn },
    });
  };

  // Narrow openings become doorways cut into walls; wide ones already dissolved their wall.
  const narrowDoors = data.doors.filter((d) => d.widthIn < OPEN_BOUNDARY_MIN_WIDTH_IN);
  for (const d of resolveDoorsToWalls(narrowDoors, walls)) {
    await placeOpening('doorway', d, 40, 80);
  }
  for (const w of resolveDoorsToWalls(data.windows, walls)) {
    await placeOpening('window', w, 57, 66);
  }

  // Built-in fixtures only (kitchen counters, appliances, bath) — deliberately no loose furniture,
  // so visitors get an empty apartment to furnish themselves.
  for (const f of data.fixtures) {
    const catalogId = FIXTURE_TYPE_TO_CATALOG_ID[f.type];
    const catalog = catalogId ? getCatalogItem(catalogId) : undefined;
    if (!catalog) continue;
    const sideways = f.facing === 'left' || f.facing === 'right';
    const item: PlacedItem = {
      id: uuid(),
      roomId,
      catalogItemId: catalog.id,
      x: f.center.x,
      z: f.center.z,
      rotationY: fixtureFacingToRotationY(f.facing),
      color: catalog.color,
      customDimensions: {
        widthIn: sideways ? f.depthIn : f.widthIn,
        depthIn: sideways ? f.widthIn : f.depthIn,
        heightIn: catalog.defaultDimensions.heightIn,
      },
    };
    await db.savePlacedItem(item);
  }

  try {
    localStorage.setItem(SEEDED_FLAG, '1');
  } catch {
    /* ignore */
  }
}
