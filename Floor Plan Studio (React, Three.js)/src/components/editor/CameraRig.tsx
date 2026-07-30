import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PlacedItem, Wall } from '../../types';
import { getCatalogItem } from '../../data/furnitureCatalog';
import { effectiveDimensions } from '../../lib/geometry';
import { wallLength } from '../../lib/floorPlan';
import { inchesToScene } from '../../lib/units';

/** Eye height in feet. Slightly below a real 5'6" eyeline — a lower viewpoint makes ceilings and
 * rooms read as taller and more open, which is the classic trick for making interiors feel big. */
const WALK_HEIGHT = 4.9;
const WALK_SPEED = 11;
const SPRINT_MULTIPLIER = 2.1;
/** Higher = snappier starts/stops. Smoothing keeps the camera from feeling like it teleports. */
const ACCEL = 14;
/** Wide field of view for walk mode. The orbit default (50°) is tunnel-like in first person;
 * ~78° is the game-standard range and dramatically opens up how much of a room you can see. */
export const WALK_FOV = 78;
export const ORBIT_FOV = 50;
/** Furniture below this height (rugs, low thresholds) is stepped over rather than collided with. */
const STEP_OVER_HEIGHT_IN = 8;
// Half-width of the walking "body" for wall collision, in scene units (feet). Kept deliberately
// small so you slip through doorways and past furniture without snagging — an oversized radius is
// a big part of what makes a space feel cramped, since you stop well before you visually arrive.
const PLAYER_RADIUS = 0.5;

function closestPointOnSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq === 0) return { x: ax, z: az, t: 0 };
  const t = Math.min(1, Math.max(0, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  return { x: ax + abx * t, z: az + abz * t, t };
}

export function CameraRig({
  mode,
  target,
  walkSpawnTarget,
  walkLookDir = [0, -1],
  bounds,
  walls,
  items,
  heldItemId,
  orbitControlsRef,
}: {
  mode: 'orbit' | 'walk';
  target: [number, number, number];
  /** Where Walk mode spawns — may differ from `target` (e.g. the largest room's center rather
   * than the whole apartment's bounding-box center, which can fall outside every room). */
  walkSpawnTarget: [number, number, number];
  /** [x, z] initial facing direction for Walk mode — should point along the room's longer axis
   * so the first frame doesn't stare point-blank into a nearby wall in a narrow room. */
  walkLookDir?: [number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Interior/exterior walls — Walk mode collides against these so you can't clip through a
   * solid wall into empty space. */
  walls: Wall[];
  /** Placed items — any `cutsWall` item (doorway/window) opens a gap in its wall that Walk mode
   * lets you pass through, matching the same gap the wall's mesh is rendered with. Solid items
   * also act as obstacles you bump into. */
  items: PlacedItem[];
  /** Item currently carried in first person — excluded from collision so it doesn't push you. */
  heldItemId?: string | null;
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const prevMode = useRef(mode);
  const velocity = useRef({ x: 0, z: 0 });

  const wallsScene = useMemo(
    () =>
      walls.map((w) => {
        const len = wallLength(w);
        const gaps = items
          .filter((it) => it.wallMounted?.wallId === w.id)
          .map((it) => {
            const catalog = getCatalogItem(it.catalogItemId);
            if (!catalog?.cutsWall) return null;
            const dims = effectiveDimensions(it, catalog.defaultDimensions);
            const offsetIn = it.wallMounted!.offsetIn;
            // Only gaps that reach (nearly) down to the floor are walkable — a window also cuts
            // the wall's mesh, but its sill still blocks you from strolling out of the building.
            const gapBottomIn = it.wallMounted!.heightOffsetIn - dims.heightIn / 2;
            if (gapBottomIn > 12) return null;
            return {
              startT: Math.max(0, offsetIn - dims.widthIn / 2) / len,
              endT: Math.min(len, offsetIn + dims.widthIn / 2) / len,
            };
          })
          .filter((g): g is { startT: number; endT: number } => !!g);
        return {
          ax: inchesToScene(w.a.x),
          az: inchesToScene(w.a.z),
          bx: inchesToScene(w.b.x),
          bz: inchesToScene(w.b.z),
          halfThickness: inchesToScene(w.thicknessIn) / 2,
          gaps,
        };
      }),
    [walls, items],
  );

  /** Solid furniture footprints as rotated rectangles, so you bump into the sofa instead of
   * walking through it. Rugs and other ankle-height items are excluded (you step over them), as
   * are wall-mounted items (they're part of the wall, already handled above). */
  const obstaclesScene = useMemo(
    () =>
      items
        .filter((it) => !it.wallMounted && it.id !== heldItemId)
        .map((it) => {
          const catalog = getCatalogItem(it.catalogItemId);
          if (!catalog || catalog.cutsWall) return null;
          const dims = effectiveDimensions(it, catalog.defaultDimensions);
          if (dims.heightIn <= STEP_OVER_HEIGHT_IN) return null;
          return {
            x: inchesToScene(it.x),
            z: inchesToScene(it.z),
            halfW: inchesToScene(dims.widthIn) / 2,
            halfD: inchesToScene(dims.depthIn) / 2,
            rotationY: it.rotationY,
          };
        })
        .filter((o): o is NonNullable<typeof o> => !!o),
    [items, heldItemId],
  );

  function collides(x: number, z: number): boolean {
    for (const w of wallsScene) {
      const cp = closestPointOnSegment(x, z, w.ax, w.az, w.bx, w.bz);
      const dist = Math.hypot(x - cp.x, z - cp.z);
      if (dist >= w.halfThickness + PLAYER_RADIUS) continue;
      if (w.gaps.some((g) => cp.t >= g.startT && cp.t <= g.endT)) continue;
      return true;
    }
    for (const o of obstaclesScene) {
      // Rotate the player into the item's local frame, then do a cheap circle-vs-AABB test.
      const dx = x - o.x;
      const dz = z - o.z;
      const cos = Math.cos(-o.rotationY);
      const sin = Math.sin(-o.rotationY);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      const nearestX = Math.min(Math.max(localX, -o.halfW), o.halfW);
      const nearestZ = Math.min(Math.max(localZ, -o.halfD), o.halfD);
      if (Math.hypot(localX - nearestX, localZ - nearestZ) < PLAYER_RADIUS) return true;
    }
    return false;
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (mode === 'walk' && prevMode.current !== 'walk') {
      // Spawn inside the largest room's center rather than offset toward an edge or the overall
      // apartment bounding-box center — either can land right against (or outside) a wall for
      // non-square or multi-room apartments.
      // The room's centroid can sit inside auto-placed furniture (a kitchen island, a bed), which
      // would leave the player embedded in it. Spiral outward for the nearest clear spot.
      let spawnX = walkSpawnTarget[0];
      let spawnZ = walkSpawnTarget[2];
      if (collides(spawnX, spawnZ)) {
        const STEP = 0.75;
        search: for (let ring = 1; ring <= 16; ring++) {
          for (let i = 0; i < ring * 8; i++) {
            const angle = (i / (ring * 8)) * Math.PI * 2;
            const cx = walkSpawnTarget[0] + Math.cos(angle) * ring * STEP;
            const cz = walkSpawnTarget[2] + Math.sin(angle) * ring * STEP;
            if (cx < bounds.minX || cx > bounds.maxX || cz < bounds.minZ || cz > bounds.maxZ) continue;
            if (!collides(cx, cz)) {
              spawnX = cx;
              spawnZ = cz;
              break search;
            }
          }
        }
      }
      camera.position.set(spawnX, WALK_HEIGHT, spawnZ);
      camera.lookAt(spawnX + walkLookDir[0], WALK_HEIGHT, spawnZ + walkLookDir[1]);
      velocity.current = { x: 0, z: 0 };
    }
    if (mode !== 'walk' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    prevMode.current = mode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    return () => {
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  // Walk mode gets a much wider lens than orbit. This is purely optical — no real dimension
  // changes — but it's what makes first person stop feeling like looking through a tube.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    cam.fov = mode === 'walk' ? WALK_FOV : ORBIT_FOV;
    cam.updateProjectionMatrix();
  }, [mode, camera]);

  useFrame((_, delta) => {
    if (mode !== 'walk') return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    const wish = new THREE.Vector3();
    if (keys.current['KeyW'] || keys.current['ArrowUp']) wish.add(dir);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) wish.sub(dir);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) wish.add(right);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) wish.sub(right);

    const sprinting = keys.current['ShiftLeft'] || keys.current['ShiftRight'];
    const targetSpeed = WALK_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(targetSpeed);

    // Ease the actual velocity toward the desired one so starts and stops feel weighted rather
    // than instantaneous. Frame-rate independent via the exponential form.
    const blend = 1 - Math.exp(-ACCEL * delta);
    velocity.current.x += (wish.x - velocity.current.x) * blend;
    velocity.current.z += (wish.z - velocity.current.z) * blend;
    if (Math.abs(velocity.current.x) < 0.001) velocity.current.x = 0;
    if (Math.abs(velocity.current.z) < 0.001) velocity.current.z = 0;

    const stepX = velocity.current.x * delta;
    const stepZ = velocity.current.z * delta;
    if (stepX !== 0 || stepZ !== 0) {
      // If we're already inside something (spawned on top of a fixture, or furniture was placed
      // around us), every candidate position collides and the player would be frozen in place.
      // In that case let movement through unconditionally so they can walk back out.
      const stuck = collides(camera.position.x, camera.position.z);

      // Resolve X and Z separately so hitting a wall at an angle slides you along it instead of
      // stopping you dead — and so a diagonal move isn't blocked just because one axis collides.
      const tryX = camera.position.x + stepX;
      if (stuck || !collides(tryX, camera.position.z)) camera.position.x = tryX;
      else velocity.current.x = 0;
      const tryZ = camera.position.z + stepZ;
      if (stuck || !collides(camera.position.x, tryZ)) camera.position.z = tryZ;
      else velocity.current.z = 0;
    }
    camera.position.x = Math.min(Math.max(camera.position.x, bounds.minX), bounds.maxX);
    camera.position.z = Math.min(Math.max(camera.position.z, bounds.minZ), bounds.maxZ);
    camera.position.y = WALK_HEIGHT;
  });

  if (mode === 'walk') {
    // Scope the "click to (re-)lock" listener to the canvas itself — the drei default of
    // `document` means clicks on toolbar buttons (e.g. switching back to Orbit) would
    // re-trigger the lock request, leaving the cursor stuck locked outside the scene.
    return <PointerLockControls selector=".scene3d-canvas" />;
  }

  return (
    <OrbitControls
      ref={orbitControlsRef}
      target={target}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}
