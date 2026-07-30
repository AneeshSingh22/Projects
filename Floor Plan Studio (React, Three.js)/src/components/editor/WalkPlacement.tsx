import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlacedItem, Point2D, RoomLayout, Wall } from '../../types';
import { getCatalogItem } from '../../data/furnitureCatalog';
import { effectiveDimensions } from '../../lib/geometry';
import {
  clampToApartment,
  overlapsExistingItem,
  pointInPolygon,
  projectPointOntoWall,
  wallInwardSign,
  wallLength,
  wallSegmentPosition,
} from '../../lib/floorPlan';
import { inchesToScene, sceneToInches } from '../../lib/units';

/** How far ahead of the camera an item floats while being carried / previewed. */
const CARRY_DISTANCE_FT = 6;
/** Max distance you can be from an item to pick it up by looking at it. */
const REACH_FT = 9;
/** Furthest wall (inches) you can mount onto by looking at it — about 15 feet. */
const MAX_MOUNT_DISTANCE_IN = 180;

export interface WalkPlacementHandle {
  heldItemId: string | null;
}

/** Casts a 2D ray (from the camera, along its flattened view direction) against every wall and
 * returns the first one hit. This is what "aim at a wall" actually means — projecting the gaze
 * onto the floor instead lands mid-room when you're looking level, and finds no wall at all. */
function raycastWalls(
  walls: Wall[],
  origin: { x: number; z: number },
  dir: { x: number; z: number },
): { wall: Wall; point: Point2D; distanceIn: number } | null {
  let best: { wall: Wall; point: Point2D; distanceIn: number } | null = null;
  for (const wall of walls) {
    const sx = wall.b.x - wall.a.x;
    const sz = wall.b.z - wall.a.z;
    // Solve origin + t*dir = a + u*s  for t (along ray) and u (along the wall segment).
    const denom = dir.x * sz - dir.z * sx;
    if (Math.abs(denom) < 1e-9) continue; // parallel
    const ax = wall.a.x - origin.x;
    const az = wall.a.z - origin.z;
    const t = (ax * sz - az * sx) / denom;
    const u = (ax * dir.z - az * dir.x) / denom;
    if (t <= 0 || u < 0 || u > 1) continue; // behind the camera, or past the wall's ends
    if (!best || t < best.distanceIn) {
      best = { wall, point: { x: origin.x + dir.x * t, z: origin.z + dir.z * t }, distanceIn: t };
    }
  }
  return best;
}

/**
 * First-person ("Sims-style") furniture handling. While in Walk mode:
 *  - looking at an item and pressing E picks it up; it then follows your gaze
 *  - moving the mouse aims it, scroll wheel rotates it, click/E puts it down
 *  - selecting a catalog item while walking spawns it directly into your hands
 *
 * Position is resolved by intersecting the camera's forward ray with the floor plane, so the
 * item lands where you're actually looking rather than at a fixed offset.
 */
export function WalkPlacement({
  enabled,
  layout,
  ceilingHeightIn,
  items,
  heldItemId,
  onHeldChange,
  onDeleteItem,
  onLiveTransform,
  onCommitTransform,
  onHoverChange,
  onCanPlaceChange,
}: {
  enabled: boolean;
  layout: RoomLayout;
  ceilingHeightIn: number;
  items: PlacedItem[];
  heldItemId: string | null;
  onHeldChange: (id: string | null) => void;
  /** Remove the item currently under the crosshair (walk-mode delete). */
  onDeleteItem: (id: string) => void;
  onLiveTransform: (id: string, patch: Partial<PlacedItem>) => void;
  onCommitTransform: (id: string, patch: Partial<PlacedItem>) => void;
  /** Name of the item currently under the crosshair (for the HUD prompt), or null. */
  onHoverChange: (name: string | null) => void;
  /** True while the held item's current position is a legal drop (inside a room, not clipping
   * other furniture) — drives the ghost color and blocks placement. */
  onCanPlaceChange: (canPlace: boolean) => void;
}) {
  const { camera } = useThree();
  const [rotationOffset, setRotationOffset] = useState(0);
  const heldRef = useRef<string | null>(heldItemId);
  heldRef.current = heldItemId;
  const canPlaceRef = useRef(true);

  /** Everything already in the room, in the shape the overlap test wants. */
  const solidItems = useMemo(
    () =>
      items.map((it) => {
        const catalog = getCatalogItem(it.catalogItemId);
        const dims = catalog ? effectiveDimensions(it, catalog.defaultDimensions) : { widthIn: 0, depthIn: 0, heightIn: 0 };
        return {
          id: it.id,
          x: it.x,
          z: it.z,
          rotationY: it.rotationY,
          dims,
          heightIn: dims.heightIn,
          wallMounted: !!it.wallMounted || !!catalog?.cutsWall,
        };
      }),
    [items],
  );

  // Footprints of every placeable item, used for gaze targeting. Wall-hung pieces (TV, art) are
  // included so you can look at one and pick it up or remove it; doorways/windows are excluded
  // since they're structural openings rather than furniture.
  const targets = useMemo(
    () =>
      items
        .map((it) => {
          const catalog = getCatalogItem(it.catalogItemId);
          if (!catalog || catalog.cutsWall) return null;
          const dims = effectiveDimensions(it, catalog.defaultDimensions);
          return {
            id: it.id,
            name: catalog.name,
            x: inchesToScene(it.x),
            z: inchesToScene(it.z),
            radius: inchesToScene(Math.max(dims.widthIn, dims.depthIn)) / 2,
            height: inchesToScene(dims.heightIn),
          };
        })
        .filter((t): t is NonNullable<typeof t> => !!t),
    [items],
  );

  /** Where the camera's forward ray meets the floor, clamped to a comfortable carry distance. */
  function gazeFloorPoint(): { x: number; z: number } {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const origin = camera.position;
    // Ray/plane intersection with y = 0. When looking level or upward, fall back to a fixed
    // distance ahead so the item doesn't shoot off to infinity.
    let dist = CARRY_DISTANCE_FT;
    if (dir.y < -0.05) {
      dist = Math.min(-origin.y / dir.y, CARRY_DISTANCE_FT * 2.5);
    }
    const flat = new THREE.Vector3(dir.x, 0, dir.z);
    if (flat.lengthSq() < 1e-6) flat.set(0, 0, -1);
    flat.normalize();
    const horizontal = Math.max(1.5, dist * Math.sqrt(Math.max(dir.x * dir.x + dir.z * dir.z, 1e-6)));
    return { x: origin.x + flat.x * horizontal, z: origin.z + flat.z * horizontal };
  }

  /** The nearest item whose footprint the camera is looking at, within reach. */
  function gazeTarget(): { id: string; name: string } | null {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const flat = new THREE.Vector2(dir.x, dir.z);
    if (flat.lengthSq() < 1e-6) return null;
    flat.normalize();

    let best: { id: string; name: string } | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const toItem = new THREE.Vector2(t.x - camera.position.x, t.z - camera.position.z);
      const along = toItem.dot(flat);
      if (along <= 0 || along > REACH_FT) continue;
      // Perpendicular distance from the view ray to the item's center.
      const perp = Math.abs(toItem.x * flat.y - toItem.y * flat.x);
      if (perp > t.radius) continue;
      if (along < bestDist) {
        bestDist = along;
        best = { id: t.id, name: t.name };
      }
    }
    return best;
  }

  // Keep the held item glued to where the player is looking.
  useFrame(() => {
    if (!enabled || !heldRef.current) return;
    const item = items.find((it) => it.id === heldRef.current);
    if (!item) return;
    const catalog = getCatalogItem(item.catalogItemId);
    if (!catalog) return;
    const dims = effectiveDimensions(item, catalog.defaultDimensions);

    const gaze = gazeFloorPoint();
    const targetIn = { x: sceneToInches(gaze.x), z: sceneToInches(gaze.z) };

    // Wall-hung things (TV, art, windows, doorways) mount to whichever wall you're aiming at
    // rather than dropping to the floor, at the height your gaze meets that wall.
    if (catalog.defaultWallMounted) {
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const flatLen = Math.hypot(camDir.x, camDir.z) || 1e-6;
      const hit = raycastWalls(
        layout.walls,
        { x: sceneToInches(camera.position.x), z: sceneToInches(camera.position.z) },
        { x: camDir.x / flatLen, z: camDir.z / flatLen },
      );
      if (hit) {
        const wall = hit.wall;
        const onWall = projectPointOntoWall(wall, hit.point);
        // Only mount if the wall is within arm's-reach-ish; otherwise you'd hang a TV across
        // the apartment just by glancing at a far wall.
        if (hit.distanceIn <= MAX_MOUNT_DISTANCE_IN) {
          const len = wallLength(wall);
          const along = Math.min(Math.max(onWall, dims.widthIn / 2), Math.max(len - dims.widthIn / 2, dims.widthIn / 2));
          const space = layout.spaces.find((s) => wall.spaceIds.includes(s.id));
          const inward = space ? wallInwardSign(wall, space) : 1;
          // Openings (doorway/window) belong inside the wall; everything else sits on its
          // interior FACE — half the wall thickness out from the centerline, then out again by
          // half the item's depth, or it renders buried inside the wall.
          const insetIn = catalog.cutsWall ? 0 : wall.thicknessIn / 2 + dims.depthIn / 2;
          const pos = wallSegmentPosition(wall, along, insetIn, inward);

          // Height comes from where the view ray actually crosses the wall plane, so you hang a
          // TV by looking at the spot you want it. Doorways stay floor-anchored.
          let heightOffsetIn = item.wallMounted?.heightOffsetIn ?? 48;
          if (catalog.geometry.kind === 'doorway') {
            heightOffsetIn = dims.heightIn / 2;
          } else {
            // Height where the view ray crosses the wall — so you hang it by looking at the spot.
            const yFt = camera.position.y + (camDir.y / flatLen) * inchesToScene(hit.distanceIn);
            heightOffsetIn = sceneToInches(yFt);
          }
          const halfH = dims.heightIn / 2;
          heightOffsetIn = Math.min(Math.max(heightOffsetIn, halfH), Math.max(ceilingHeightIn - halfH, halfH));

          onLiveTransform(item.id, {
            x: pos.x,
            z: pos.z,
            rotationY: pos.rotationY,
            wallMounted: { wallId: wall.id, offsetIn: along, heightOffsetIn },
          });
          if (!canPlaceRef.current) {
            canPlaceRef.current = true;
            onCanPlaceChange(true);
          }
          return;
        }
      }
      // Too far from any wall to mount — show it as an illegal placement.
      if (canPlaceRef.current) {
        canPlaceRef.current = false;
        onCanPlaceChange(false);
      }
      return;
    }

    // Face the item toward the player, plus whatever the scroll wheel has added.
    const yaw = Math.atan2(camera.position.x - gaze.x, camera.position.z - gaze.z) + rotationOffset;
    const clamped = clampToApartment(layout, targetIn.x, targetIn.z, dims, yaw);
    onLiveTransform(item.id, { x: clamped.x, z: clamped.z, rotationY: yaw });

    const legal =
      isInsideAnyRoom(layout, clamped.x, clamped.z) &&
      !overlapsExistingItem(solidItems, clamped.x, clamped.z, dims, yaw, item.id);
    if (legal !== canPlaceRef.current) {
      canPlaceRef.current = legal;
      onCanPlaceChange(legal);
    }
  });

  // Crosshair hover prompt (only meaningful when not already carrying something).
  useFrame(() => {
    if (!enabled) return;
    if (heldRef.current) {
      onHoverChange(null);
      return;
    }
    onHoverChange(gazeTarget()?.name ?? null);
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (e.code === 'KeyE') {
        e.preventDefault();
        if (heldRef.current) {
          if (!canPlaceRef.current) return; // blocked: would clip furniture or land outside
          onCommitTransform(heldRef.current, {});
          onHeldChange(null);
          setRotationOffset(0);
          canPlaceRef.current = true;
          onCanPlaceChange(true);
        } else {
          const hit = gazeTarget();
          if (hit) {
            setRotationOffset(0);
            onHeldChange(hit.id);
          }
        }
      } else if (e.code === 'KeyR' && heldRef.current) {
        e.preventDefault();
        setRotationOffset((r) => r + Math.PI / 12);
      } else if (e.code === 'KeyX' || e.code === 'Delete' || e.code === 'Backspace') {
        // Remove what you're carrying, or what you're looking at.
        e.preventDefault();
        if (heldRef.current) {
          const id = heldRef.current;
          onHeldChange(null);
          setRotationOffset(0);
          canPlaceRef.current = true;
          onCanPlaceChange(true);
          onDeleteItem(id);
        } else {
          const hit = gazeTarget();
          if (hit) onDeleteItem(hit.id);
        }
      } else if (e.code === 'Escape' && heldRef.current) {
        // Leaving with something in hand: commit wherever it is rather than stranding it on the
        // camera. Overlap is tolerated here — bailing out shouldn't trap the user.
        onCommitTransform(heldRef.current, {});
        onHeldChange(null);
        setRotationOffset(0);
        canPlaceRef.current = true;
        onCanPlaceChange(true);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!heldRef.current) return;
      e.preventDefault();
      setRotationOffset((r) => r + (e.deltaY > 0 ? 1 : -1) * (Math.PI / 24));
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only act while the pointer is actually locked into the scene, so UI clicks are unaffected.
      if (!document.pointerLockElement) return;
      if (e.button === 0 && heldRef.current) {
        if (!canPlaceRef.current) return; // blocked: would clip furniture or land outside
        onCommitTransform(heldRef.current, {});
        onHeldChange(null);
        setRotationOffset(0);
        canPlaceRef.current = true;
        onCanPlaceChange(true);
      } else if (e.button === 0) {
        const hit = gazeTarget();
        if (hit) {
          setRotationOffset(0);
          onHeldChange(hit.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousedown', onMouseDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, items, targets]);

  // Leaving walk mode should never strand an item attached to the camera.
  useEffect(() => {
    if (enabled) return;
    if (heldRef.current) {
      onCommitTransform(heldRef.current, {});
      onHeldChange(null);
      setRotationOffset(0);
    }
    onHoverChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return null;
}

/** True when the point is inside any of the layout's rooms — used to tint the placement ghost. */
export function isInsideAnyRoom(layout: RoomLayout, xIn: number, zIn: number): boolean {
  return layout.spaces.some((s) => pointInPolygon({ x: xIn, z: zIn }, s.polygon));
}
