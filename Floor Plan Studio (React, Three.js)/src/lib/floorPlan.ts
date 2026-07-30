import type { ItemDimensionsIn, Point2D, Room, RoomLayout, RoomSpace, Wall } from '../types';
import { roomUnitToInches } from './units';

const SIMPLE_WALL_THICKNESS_IN = 4;
const EDGE_MATCH_EPS_IN = 3;

function clamp(v: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(v, min), max);
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Returns the traced multi-room layout if present, otherwise synthesizes one rectangular
 * space + 4 walls from the simple `dimensions` fields — every downstream consumer (rendering,
 * wall-mounted items, drag clamping) works off this single shape regardless of how the room
 * was created. */
export function getRoomLayout(room: Room): RoomLayout {
  if (room.layout) return room.layout;
  const dims = room.dimensions;
  if (!dims) return { spaces: [], walls: [] };

  const widthIn = roomUnitToInches(dims.width, room.unit);
  const lengthIn = roomUnitToInches(dims.length, room.unit);
  const t = SIMPLE_WALL_THICKNESS_IN;

  const space: RoomSpace = {
    id: 'main',
    name: room.name,
    polygon: [
      { x: 0, z: 0 },
      { x: widthIn, z: 0 },
      { x: widthIn, z: lengthIn },
      { x: 0, z: lengthIn },
    ],
  };

  const walls: Wall[] = [
    { id: 'wall-north', a: { x: 0, z: 0 }, b: { x: widthIn, z: 0 }, thicknessIn: t, spaceIds: ['main'] },
    { id: 'wall-south', a: { x: widthIn, z: lengthIn }, b: { x: 0, z: lengthIn }, thicknessIn: t, spaceIds: ['main'] },
    { id: 'wall-west', a: { x: 0, z: lengthIn }, b: { x: 0, z: 0 }, thicknessIn: t, spaceIds: ['main'] },
    { id: 'wall-east', a: { x: widthIn, z: 0 }, b: { x: widthIn, z: lengthIn }, thicknessIn: t, spaceIds: ['main'] },
  ];

  return { spaces: [space], walls };
}

export function roomCeilingHeightIn(room: Room): number {
  if (room.layout) return room.ceilingHeightIn ?? 96;
  return room.dimensions ? roomUnitToInches(room.dimensions.height, room.unit) : 96;
}

export function pointInPolygon(pt: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersect = zi > pt.z !== zj > pt.z && pt.x < ((xj - xi) * (pt.z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonBounds(polygon: Point2D[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

export function polygonCentroid(polygon: Point2D[]): Point2D {
  let x = 0;
  let z = 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p0 = polygon[i];
    const p1 = polygon[(i + 1) % polygon.length];
    const cross = p0.x * p1.z - p1.x * p0.z;
    area += cross;
    x += (p0.x + p1.x) * cross;
    z += (p0.z + p1.z) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const n = polygon.length || 1;
    return {
      x: polygon.reduce((s, p) => s + p.x, 0) / n,
      z: polygon.reduce((s, p) => s + p.z, 0) / n,
    };
  }
  return { x: x / (6 * area), z: z / (6 * area) };
}

export function polygonArea(polygon: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p0 = polygon[i];
    const p1 = polygon[(i + 1) % polygon.length];
    area += p0.x * p1.z - p1.x * p0.z;
  }
  return Math.abs(area / 2);
}

function findContainingOrNearestSpace(spaces: RoomSpace[], pt: Point2D): RoomSpace | undefined {
  for (const s of spaces) {
    if (pointInPolygon(pt, s.polygon)) return s;
  }
  let best: RoomSpace | undefined;
  let bestDist = Infinity;
  for (const s of spaces) {
    const d = distance(polygonCentroid(s.polygon), pt);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

/** Clamps a footprint to stay inside whichever space currently contains (or is nearest to) the
 * point — this is what lets furniture be dragged freely between rooms through doorways. Uses
 * each space's axis-aligned bounding box rather than true polygon-footprint containment, which
 * is exact for rectangular rooms and a reasonable approximation for irregular ones (the visible
 * floor shape still shows the user exactly where the real boundary is). */
export function clampToApartment(
  layout: RoomLayout,
  x: number,
  z: number,
  dims: ItemDimensionsIn,
  rotationY: number,
): { x: number; z: number } {
  const space = findContainingOrNearestSpace(layout.spaces, { x, z });
  if (!space) return { x, z };
  const bounds = polygonBounds(space.polygon);
  const rotated = Math.abs(Math.round((rotationY / (Math.PI / 2)) % 2)) === 1;
  const halfW = (rotated ? dims.depthIn : dims.widthIn) / 2;
  const halfD = (rotated ? dims.widthIn : dims.depthIn) / 2;
  return {
    x: clamp(x, bounds.minX + halfW, bounds.maxX - halfW),
    z: clamp(z, bounds.minZ + halfD, bounds.maxZ - halfD),
  };
}

/** Default drop position for a newly-added catalog item, spread out from the space's centroid. */
export function nextDropSpotInSpace(space: RoomSpace, existingCount: number): Point2D {
  const centroid = polygonCentroid(space.polygon);
  const bounds = polygonBounds(space.polygon);
  const cols = Math.max(1, Math.floor((bounds.maxX - bounds.minX) / 48));
  const col = existingCount % cols;
  const row = Math.floor(existingCount / cols);
  return {
    x: clamp(centroid.x - ((cols - 1) * 48) / 2 + col * 48, bounds.minX + 24, bounds.maxX - 24),
    z: clamp(centroid.z - 48 + row * 48, bounds.minZ + 24, bounds.maxZ - 24),
  };
}

function closestPointOnSegment(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const lenSq = abx * abx + abz * abz;
  if (lenSq === 0) return { ...a };
  const t = clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / lenSq, 0, 1);
  return { x: a.x + abx * t, z: a.z + abz * t };
}

export function findNearestWall(walls: Wall[], pt: Point2D): Wall | undefined {
  let best: Wall | undefined;
  let bestDist = Infinity;
  for (const w of walls) {
    const d = distance(closestPointOnSegment(pt, w.a, w.b), pt);
    if (d < bestDist) {
      bestDist = d;
      best = w;
    }
  }
  return best;
}

export function wallLength(wall: Wall): number {
  return distance(wall.a, wall.b);
}

/** Projects a point onto a wall's line, returning the offset (in inches) from endpoint `a`. */
export function projectPointOntoWall(wall: Wall, pt: Point2D): number {
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const lenSq = dx * dx + dz * dz || 1;
  const t = clamp(((pt.x - wall.a.x) * dx + (pt.z - wall.a.z) * dz) / lenSq, 0, 1);
  return t * Math.sqrt(lenSq);
}

/** +1 or -1 depending on which of the wall's two perpendicular directions points toward the
 * given space's interior — used so wall-mounted items sit flush against the room side. */
export function wallInwardSign(wall: Wall, space: RoomSpace): 1 | -1 {
  const midX = (wall.a.x + wall.b.x) / 2;
  const midZ = (wall.a.z + wall.b.z) / 2;
  const centroid = polygonCentroid(space.polygon);
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const nx = -dz;
  const nz = dx;
  const dot = (centroid.x - midX) * nx + (centroid.z - midZ) * nz;
  return dot >= 0 ? 1 : -1;
}

/** Resolves a wall-relative placement (offset along the wall + inset from its centerline) into
 * apartment-global x/z/rotationY. `inwardSign` picks which perpendicular direction is "into the
 * room" (see `wallInwardSign`). */
export function wallSegmentPosition(
  wall: Wall,
  offsetIn: number,
  insetIn: number,
  inwardSign: 1 | -1 = 1,
): { x: number; z: number; rotationY: number } {
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const clampedOffset = clamp(offsetIn, 0, len);
  const nx = -uz * inwardSign;
  const nz = ux * inwardSign;
  return {
    x: wall.a.x + ux * clampedOffset + nx * insetIn,
    z: wall.a.z + uz * clampedOffset + nz * insetIn,
    rotationY: Math.atan2(nx, nz),
  };
}

/** Axis-aligned footprint of a rotated item, in inches. Rotation is snapped to the nearest
 * quarter turn for the swap test, which is exact for the 90° placements furniture actually uses
 * and a close approximation otherwise. */
function footprintOf(x: number, z: number, dims: ItemDimensionsIn, rotationY: number) {
  const rotated = Math.abs(Math.round(rotationY / (Math.PI / 2))) % 2 === 1;
  const halfW = (rotated ? dims.depthIn : dims.widthIn) / 2;
  const halfD = (rotated ? dims.widthIn : dims.depthIn) / 2;
  return { minX: x - halfW, maxX: x + halfW, minZ: z - halfD, maxZ: z + halfD };
}

/** True when placing `dims` at (x,z) would overlap an existing solid item. Rugs and other
 * ankle-height pieces are ignored — you're meant to put furniture on top of them — as are
 * wall-mounted items and the item being moved itself. */
export function overlapsExistingItem(
  items: { id: string; x: number; z: number; rotationY: number; dims: ItemDimensionsIn; heightIn: number; wallMounted: boolean }[],
  x: number,
  z: number,
  dims: ItemDimensionsIn,
  rotationY: number,
  ignoreId?: string,
  stepOverHeightIn = 8,
): boolean {
  if (dims.heightIn <= stepOverHeightIn) return false;
  const a = footprintOf(x, z, dims, rotationY);
  const marginIn = 1; // let pieces sit flush without registering as a collision
  for (const item of items) {
    if (item.id === ignoreId || item.wallMounted) continue;
    if (item.heightIn <= stepOverHeightIn) continue;
    const b = footprintOf(item.x, item.z, item.dims, item.rotationY);
    const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
    if (overlapX > marginIn && overlapZ > marginIn) return true;
  }
  return false;
}

/** If an item's center is within `thresholdIn` of a wall face (measured from where its back
 * would sit), snaps it flush against that wall, facing into the room — the "push the sofa against
 * the wall" gesture. Returns null when nothing is close enough. */
export function snapItemToNearestWall(
  layout: RoomLayout,
  x: number,
  z: number,
  dims: ItemDimensionsIn,
  thresholdIn = 6,
): { x: number; z: number; rotationY: number } | null {
  const wall = findNearestWall(layout.walls, { x, z });
  if (!wall) return null;
  const onWall = closestPointOnSegment({ x, z }, wall.a, wall.b);
  const dist = distance(onWall, { x, z });
  const targetDist = wall.thicknessIn / 2 + dims.depthIn / 2;
  if (dist > targetDist + thresholdIn) return null;

  const space = layout.spaces.find((s) => wall.spaceIds.includes(s.id) && pointInPolygon({ x, z }, s.polygon));
  const inward = space ? wallInwardSign(wall, space) : 1;
  const len = wallLength(wall);
  const along = clamp(projectPointOntoWall(wall, { x, z }), dims.widthIn / 2, Math.max(len - dims.widthIn / 2, dims.widthIn / 2));
  const pos = wallSegmentPosition(wall, along, targetDist, inward);
  // wallSegmentPosition's rotation faces the inward normal (away from the wall) — correct for
  // furniture whose back should touch the wall.
  return pos;
}

export function apartmentBounds(layout: RoomLayout) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const space of layout.spaces) {
    for (const p of space.polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
  }
  if (!isFinite(minX)) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0, centerX: 0, centerZ: 0 };
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

export interface RawTracedSpace {
  id: string;
  name: string;
  polygon: Point2D[];
}

/** Converts an image-pixel polygon (x,y) to apartment-global inches (x,z) using a calibrated
 * pixels-per-inch scale — used by both manual calibration and OCR-based auto-calibration. */
export function pixelPolygonToInches(polygonPx: { x: number; y: number }[], pixelsPerInch: number): Point2D[] {
  return polygonPx.map((p) => ({ x: p.x / pixelsPerInch, z: p.y / pixelsPerInch }));
}

export interface RawDoor {
  /** center of the opening, apartment-global inches */
  center: Point2D;
  widthIn: number;
}

/** A built-in fixture (counter, toilet, tub, …) detected on the floor plan, in apartment-global
 * inches. `widthIn`/`depthIn` are image-axis extents; `facing` is the direction its front faces
 * ('down' = toward image bottom = world +z). */
export interface RawFixture {
  type: string;
  center: Point2D;
  widthIn: number;
  depthIn: number;
  facing: 'up' | 'down' | 'left' | 'right';
}

/** rotationY that makes an item (which faces +z at rotation 0) face the given image direction. */
export function fixtureFacingToRotationY(facing: RawFixture['facing']): number {
  switch (facing) {
    case 'down':
      return 0;
    case 'right':
      return Math.PI / 2;
    case 'up':
      return Math.PI;
    case 'left':
      return -Math.PI / 2;
  }
}

/** A door placement resolved onto a specific wall segment. */
export interface ResolvedDoor {
  wallId: string;
  offsetIn: number;
  widthIn: number;
}

/** Snaps each detected opening onto the wall it actually sits on, converting its position into
 * a wall-relative offset. Openings that land nowhere near a wall (a bad detection) are dropped,
 * as are ones too close to a wall's end to fit — cutting there would leave a floating stub of
 * wall rather than a usable doorway. */
export function resolveDoorsToWalls(doors: RawDoor[], walls: Wall[], maxSnapDistIn = 36): ResolvedDoor[] {
  const resolved: ResolvedDoor[] = [];
  for (const door of doors) {
    let bestWall: Wall | undefined;
    let bestDist = maxSnapDistIn;
    for (const wall of walls) {
      const d = distance(closestPointOnSegment(door.center, wall.a, wall.b), door.center);
      if (d < bestDist) {
        bestDist = d;
        bestWall = wall;
      }
    }
    if (!bestWall) continue;

    const len = wallLength(bestWall);
    // Shrink the opening if the wall is too short to host it at full width.
    const widthIn = Math.min(door.widthIn, len - 4);
    if (widthIn < 20) continue;

    const offsetIn = clamp(projectPointOntoWall(bestWall, door.center), widthIn / 2, len - widthIn / 2);
    resolved.push({ wallId: bestWall.id, offsetIn, widthIn });
  }
  return resolved;
}

interface RawEdge {
  a: Point2D;
  b: Point2D;
  spaceId: string;
}

const COLINEAR_ANGLE_EPS = 0.02; // ~1.1 degrees, as a unit-vector cross-product threshold
const BREAKPOINT_EPS_IN = 1;

function edgeDirection(a: Point2D, b: Point2D): { ux: number; uz: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { ux: dx / len, uz: dz / len };
}

/** Matches polygon edges shared between traced rooms — including T-junctions where a shorter
 * wall meets partway along a longer one, which is extremely common in real floor plans — into
 * `Wall` segments referencing every space that borders each stretch. This is what lets a single
 * doorway placed on a shared wall open a path between both rooms, instead of only cutting one of
 * two overlapping wall boxes. Unmatched stretches become single-space exterior walls. */
/** An opening wide enough that the two spaces read as one open-plan area rather than two rooms
 * joined by a door. At/above this, no wall is built along that stretch at all. */
const OPEN_BOUNDARY_MIN_WIDTH_IN = 72;

/** Strips wall segments that fall inside a wide opening. A 10ft gap between a kitchen and living
 * room is an open boundary, not a doorway — building a wall there and cutting a hole in it leaves
 * visible stubs on either side and reads as a wall that shouldn't exist. */
function removeOpenBoundaries(walls: Wall[], openings: RawDoor[]): Wall[] {
  const wide = openings.filter((o) => o.widthIn >= OPEN_BOUNDARY_MIN_WIDTH_IN);
  if (wide.length === 0) return walls;

  return walls.filter((wall) => {
    // Only interior walls (shared by two spaces) can be an open boundary; never delete an
    // exterior wall, or the apartment would leak into the void.
    if (wall.spaceIds.length < 2) return true;
    const midpoint = { x: (wall.a.x + wall.b.x) / 2, z: (wall.a.z + wall.b.z) / 2 };
    return !wide.some((o) => {
      const half = o.widthIn / 2;
      // The segment is inside the opening if its midpoint is within the opening's span and it
      // sits essentially on the same line as the opening's centre.
      return distance(midpoint, o.center) <= half;
    });
  });
}

export function dedupeWalls(
  spaces: RawTracedSpace[],
  thicknessIn = SIMPLE_WALL_THICKNESS_IN,
  /** Detected openings; wide ones dissolve the wall entirely instead of cutting a door into it. */
  openings: RawDoor[] = [],
): Wall[] {
  const edges: RawEdge[] = [];
  for (const space of spaces) {
    const n = space.polygon.length;
    for (let i = 0; i < n; i++) {
      edges.push({ a: space.polygon[i], b: space.polygon[(i + 1) % n], spaceId: space.id });
    }
  }

  // Group edges that lie on the same infinite line (regardless of which room/direction traced them).
  const groups: { origin: Point2D; ux: number; uz: number; edges: RawEdge[] }[] = [];
  for (const edge of edges) {
    const { ux, uz } = edgeDirection(edge.a, edge.b);
    const group = groups.find((g) => {
      const cross = Math.abs(ux * g.uz - uz * g.ux);
      if (cross > COLINEAR_ANGLE_EPS) return false;
      const perpDist = Math.abs((edge.a.x - g.origin.x) * g.uz - (edge.a.z - g.origin.z) * g.ux);
      return perpDist <= EDGE_MATCH_EPS_IN;
    });
    if (group) group.edges.push(edge);
    else groups.push({ origin: edge.a, ux, uz, edges: [edge] });
  }

  const walls: Wall[] = [];
  for (const group of groups) {
    const project = (p: Point2D) => (p.x - group.origin.x) * group.ux + (p.z - group.origin.z) * group.uz;
    const ranges = group.edges.map((e) => {
      const ta = project(e.a);
      const tb = project(e.b);
      return { spaceId: e.spaceId, tMin: Math.min(ta, tb), tMax: Math.max(ta, tb) };
    });

    const breakpoints = [...new Set(ranges.flatMap((r) => [r.tMin, r.tMax]))].sort((a, b) => a - b);
    const merged: number[] = [];
    for (const t of breakpoints) {
      if (merged.length === 0 || t - merged[merged.length - 1] > BREAKPOINT_EPS_IN) merged.push(t);
    }

    for (let i = 0; i < merged.length - 1; i++) {
      const t0 = merged[i];
      const t1 = merged[i + 1];
      if (t1 - t0 < BREAKPOINT_EPS_IN) continue;
      const tMid = (t0 + t1) / 2;
      const spaceIds = [...new Set(ranges.filter((r) => r.tMin <= tMid && r.tMax >= tMid).map((r) => r.spaceId))];
      if (spaceIds.length === 0) continue;
      walls.push({
        id: `wall-${walls.length}`,
        a: { x: group.origin.x + group.ux * t0, z: group.origin.z + group.uz * t0 },
        b: { x: group.origin.x + group.ux * t1, z: group.origin.z + group.uz * t1 },
        thicknessIn,
        spaceIds,
      });
    }
  }

  return removeOpenBoundaries(walls, openings);
}
