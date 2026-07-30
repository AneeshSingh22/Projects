import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Line, Sky, Text, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';
import type { OrbitControls as OrbitControlsImpl, TransformControls as TransformControlsImpl } from 'three-stdlib';
import type { PlacedItem, Point2D, RoomLayout, SpaceStyleOverride, StyleProfile } from '../../types';
import { getCatalogItem } from '../../data/furnitureCatalog';
import { ApartmentShell } from './ApartmentShell';
import { FurnitureItem3D } from './FurnitureItem3D';
import { CameraRig } from './CameraRig';
import { WalkPlacement } from './WalkPlacement';
import { effectiveDimensions, snap } from '../../lib/geometry';
import {
  apartmentBounds,
  clampToApartment,
  findNearestWall,
  polygonArea,
  polygonBounds,
  polygonCentroid,
  projectPointOntoWall,
  snapItemToNearestWall,
  wallInwardSign,
  wallLength,
  wallSegmentPosition,
} from '../../lib/floorPlan';
import { formatInches, inchesToScene, sceneToInches } from '../../lib/units';

export type TransformMode = 'translate' | 'rotate';

interface Scene3DProps {
  layout: RoomLayout;
  ceilingHeightIn: number;
  style: StyleProfile;
  spaceStyles?: Record<string, SpaceStyleOverride>;
  items: PlacedItem[];
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  cameraMode: 'orbit' | 'walk';
  transformMode: TransformMode;
  gridSnap: boolean;
  wallOpacity: number;
  cameraLocked: boolean;
  /** measure mode: clicks on the floor place measurement endpoints instead of selecting */
  measureMode: boolean;
  /** remove-wall mode: hovering a wall highlights it, clicking deletes it */
  removeWallMode: boolean;
  onRemoveWall: (wallId: string) => void;
  /** item currently carried in first-person walk mode */
  heldItemId: string | null;
  onHeldChange: (id: string | null) => void;
  /** name of the item under the walk-mode crosshair, for the HUD prompt */
  onWalkHoverChange: (name: string | null) => void;
  /** whether the held item's current spot is a legal drop */
  canPlaceHeld: boolean;
  onCanPlaceChange: (canPlace: boolean) => void;
  /** delete an item from inside walk mode */
  onDeleteItem: (id: string) => void;
  /** bump this number to snap the orbit camera to a straight-overhead top view */
  topViewSignal: number;
  /** called at the start of a drag/rotate gesture so the store can snapshot for undo */
  onBeginMutation: () => void;
  onCommitTransform: (id: string, patch: Partial<PlacedItem>) => void;
  onLiveTransform: (id: string, patch: Partial<PlacedItem>) => void;
}

export const Scene3D = forwardRef<HTMLCanvasElement, Scene3DProps>(function Scene3D(
  {
    layout,
    ceilingHeightIn,
    style,
    spaceStyles,
    items,
    selectedItemId,
    onSelect,
    cameraMode,
    transformMode,
    gridSnap,
    wallOpacity,
    cameraLocked,
    measureMode,
    removeWallMode,
    onRemoveWall,
    heldItemId,
    onHeldChange,
    onWalkHoverChange,
    canPlaceHeld,
    onCanPlaceChange,
    onDeleteItem,
    topViewSignal,
    onBeginMutation,
    onCommitTransform,
    onLiveTransform,
  },
  canvasRef,
) {
  const apBounds = apartmentBounds(layout);
  const centerX = inchesToScene(apBounds.centerX);
  const centerZ = inchesToScene(apBounds.centerZ);
  const spanW = inchesToScene(apBounds.width);
  const spanD = inchesToScene(apBounds.depth);
  const h = inchesToScene(ceilingHeightIn);

  // The apartment's overall bounding-box center can fall outside every room for L/T-shaped
  // layouts (in the "notch"), right up against a wall — walk mode should instead spawn inside
  // whichever room is actually largest, facing along that room's longer axis so the first frame
  // doesn't stare point-blank into a nearby wall in a narrow room.
  const largestSpace = [...layout.spaces].sort((a, b) => polygonArea(b.polygon) - polygonArea(a.polygon))[0];
  const walkSpawn = largestSpace ? polygonCentroid(largestSpace.polygon) : { x: apBounds.centerX, z: apBounds.centerZ };
  const walkSpawnTarget: [number, number, number] = [inchesToScene(walkSpawn.x), 0, inchesToScene(walkSpawn.z)];
  const largestSpaceBounds = largestSpace ? polygonBounds(largestSpace.polygon) : undefined;
  const walkLookDir: [number, number] =
    largestSpaceBounds && largestSpaceBounds.maxX - largestSpaceBounds.minX > largestSpaceBounds.maxZ - largestSpaceBounds.minZ
      ? [1, 0]
      : [0, -1];

  // Positioned high and well outside the footprint so the initial view looks down
  // over the walls into the apartment, instead of straight into an opaque wall face.
  const initialCameraPosition: [number, number, number] = [
    centerX + spanW * 0.65,
    h + Math.max(spanW, spanD) * 1.1,
    centerZ + spanD * 0.65,
  ];

  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const transformRef = useRef<TransformControlsImpl | null>(null);
  const itemRefs = useRef<Record<string, Group>>({});
  const [selectedObject, setSelectedObject] = useState<Group | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [measurePoints, setMeasurePoints] = useState<Point2D[]>([]);
  const cameraLockedRef = useRef(cameraLocked);

  useEffect(() => {
    if (!measureMode) setMeasurePoints([]);
  }, [measureMode]);

  function handleMeasureClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const pt: Point2D = { x: sceneToInches(e.point.x), z: sceneToInches(e.point.z) };
    setMeasurePoints((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
  }

  const selectedItem = items.find((it) => it.id === selectedItemId);
  const draggingItem = draggingId ? items.find((it) => it.id === draggingId) : undefined;
  const draggingWall = draggingItem?.wallMounted
    ? layout.walls.find((w) => w.id === draggingItem.wallMounted!.wallId)
    : undefined;

  useEffect(() => {
    cameraLockedRef.current = cameraLocked;
  }, [cameraLocked]);

  // Direct dragging (floor items or along a wall) always takes priority over the manual
  // lock toggle, so orbit never fights the item you're actively repositioning.
  useEffect(() => {
    if (orbitRef.current) orbitRef.current.enabled = !cameraLocked && !draggingId;
  }, [cameraLocked, draggingId]);

  useEffect(() => {
    if (topViewSignal === 0 || !orbitRef.current) return;
    const controls = orbitRef.current;
    const topY = h + Math.max(spanW, spanD) * 1.3;
    controls.object.position.set(centerX, topY, centerZ + 0.001);
    controls.target.set(centerX, 0, centerZ);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topViewSignal]);

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;
    const dispatcher = controls as unknown as {
      addEventListener(event: string, cb: (e: { value: boolean }) => void): void;
      removeEventListener(event: string, cb: (e: { value: boolean }) => void): void;
    };
    const callback = (e: { value: boolean }) => {
      if (orbitRef.current) orbitRef.current.enabled = !e.value && !cameraLockedRef.current;
      if (e.value) onBeginMutation();
      if (!e.value && selectedItem) {
        commitRotationFromObject(selectedItem);
      }
    };
    dispatcher.addEventListener('dragging-changed', callback);
    return () => dispatcher.removeEventListener('dragging-changed', callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  function commitRotationFromObject(item: PlacedItem) {
    const obj = itemRefs.current[item.id];
    if (!obj) return;
    const catalog = getCatalogItem(item.catalogItemId);
    if (!catalog) return;
    const dims = effectiveDimensions(item, catalog.defaultDimensions);
    const rotationY = obj.rotation.y;

    if (!item.wallMounted) {
      const clamped = clampToApartment(layout, item.x, item.z, dims, rotationY);
      onCommitTransform(item.id, { rotationY, x: clamped.x, z: clamped.z });
    } else {
      onCommitTransform(item.id, { rotationY });
    }
  }

  function handleObjectChange() {
    if (!selectedItem) return;
    const obj = itemRefs.current[selectedItem.id];
    if (!obj) return;
    onLiveTransform(selectedItem.id, { rotationY: obj.rotation.y });
  }

  function handleDragStart(id: string) {
    onBeginMutation();
    setDraggingId(id);
  }

  function handleDragEnd() {
    if (draggingId) {
      // "Push it against the wall" — snap flush + face into the room when released close to a
      // wall. Rugs and wall-mounted items are exempt.
      const item = items.find((it) => it.id === draggingId);
      const catalog = item ? getCatalogItem(item.catalogItemId) : undefined;
      let patch: Partial<PlacedItem> = {};
      if (item && catalog && !item.wallMounted && catalog.geometry.kind !== 'rug') {
        const dims = effectiveDimensions(item, catalog.defaultDimensions);
        const snapped = snapItemToNearestWall(layout, item.x, item.z, dims);
        if (snapped) patch = snapped;
      }
      onCommitTransform(draggingId, patch);
    }
    setDraggingId(null);
  }

  useEffect(() => {
    if (!draggingId) return;
    const up = () => handleDragEnd();
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  function handleFloorDragMove(e: ThreeEvent<PointerEvent>) {
    if (!draggingId || !draggingItem) return;
    e.stopPropagation();
    const catalog = getCatalogItem(draggingItem.catalogItemId);
    if (!catalog) return;
    const dims = effectiveDimensions(draggingItem, catalog.defaultDimensions);
    let x = sceneToInches(e.point.x);
    let z = sceneToInches(e.point.z);
    if (gridSnap) {
      x = snap(x);
      z = snap(z);
    }
    const clamped = clampToApartment(layout, x, z, dims, draggingItem.rotationY);
    onLiveTransform(draggingId, { x: clamped.x, z: clamped.z });
  }

  /** Drags a wall-mounted item (doorway, window, art) across the plan. The pointer is tracked on
   * a single floor-level plane covering the whole apartment, and the item re-homes to whichever
   * wall is nearest that point — so it can move freely from one wall to another. Previously the
   * drag plane was pinned to the item's starting wall, which trapped it there permanently. */
  function handleWallDragMove(e: ThreeEvent<PointerEvent>) {
    if (!draggingId || !draggingItem) return;
    e.stopPropagation();
    const catalog = getCatalogItem(draggingItem.catalogItemId);
    if (!catalog) return;
    const dims = effectiveDimensions(draggingItem, catalog.defaultDimensions);

    const pointer = { x: sceneToInches(e.point.x), z: sceneToInches(e.point.z) };
    const wall = findNearestWall(layout.walls, pointer);
    if (!wall) return;

    const len = wallLength(wall);
    let along = projectPointOntoWall(wall, pointer);
    along = Math.min(Math.max(along, dims.widthIn / 2), Math.max(len - dims.widthIn / 2, dims.widthIn / 2));
    if (gridSnap) along = snap(along);

    // Height is preserved while sliding along/between walls — it's edited from the side panel,
    // and deriving it from a floor-plane hit would otherwise slam every item to the floor.
    const heightOffsetIn =
      draggingItem.wallMounted?.heightOffsetIn ?? (catalog.cutsWall ? dims.heightIn / 2 : 48);

    const space = layout.spaces.find((s) => s.id === wall.spaceIds[0]);
    const inward = space ? wallInwardSign(wall, space) : 1;
    // Clear the wall's own thickness so the item sits on its interior face, not inside it.
    const pos = wallSegmentPosition(wall, along, wall.thicknessIn / 2 + dims.depthIn / 2, inward);
    onLiveTransform(draggingId, {
      x: pos.x,
      z: pos.z,
      rotationY: pos.rotationY,
      wallMounted: { wallId: wall.id, offsetIn: along, heightOffsetIn },
    });
  }

  const bounds = useMemo(
    () => ({
      minX: inchesToScene(apBounds.minX) + 0.5,
      maxX: inchesToScene(apBounds.maxX) - 0.5,
      minZ: inchesToScene(apBounds.minZ) + 0.5,
      maxZ: inchesToScene(apBounds.maxZ) - 0.5,
    }),
    [apBounds.minX, apBounds.maxX, apBounds.minZ, apBounds.maxZ],
  );

  const span = Math.max(spanW, spanD);
  const shadowSpan = span * 0.85 + 12;

  return (
    <Canvas
      ref={canvasRef}
      className="scene3d-canvas"
      shadows
      gl={{ preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        // Filmic tone mapping is the single biggest "stops looking like a diagram" lever —
        // sunlight can be bright without clipping walls to pure white.
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      camera={{ position: initialCameraPosition, fov: 50, near: 0.1, far: 2000 }}
      onPointerMissed={() => onSelect(null)}
    >
      {/* daylight sky backdrop (procedural shader — no assets) */}
      <Sky distance={4000} sunPosition={[0.4, 0.5, -0.6]} turbidity={6} rayleigh={1.6} />

      <ambientLight intensity={0.55} />
      {/* shadow-less fill from the opposite side so interior wall faces (which never see the
          sun directly) read as painted white instead of flat gray */}
      <directionalLight position={[centerX - span * 0.7, span * 0.6 + 10, centerZ + span * 0.7]} intensity={0.7} color="#eef2f8" />
      {/* sun — direction matches the Sky's sun so window light reads correctly */}
      <directionalLight
        ref={(light) => {
          // The light's .target must live in the scene graph for its matrix to update; aiming it
          // via a plain prop silently leaves the light pointed at the world origin.
          if (light) {
            light.target.position.set(centerX, 0, centerZ);
            light.target.updateMatrixWorld();
          }
        }}
        position={[centerX + span * 0.55, span * 0.9 + 18, centerZ - span * 0.8]}
        intensity={2.4}
        color="#fff3e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-camera-near={1}
        shadow-camera-far={span * 4 + 80}
      />
      {/* soft blue skylight + warm ground bounce */}
      <hemisphereLight args={['#bdd7f2', '#8a7a64', 1.0]} />

      <ApartmentShell
        layout={layout}
        ceilingHeightIn={ceilingHeightIn}
        wallOpacity={wallOpacity}
        items={items}
        style={style}
        spaceStyles={spaceStyles}
        showGrid={cameraMode === 'orbit'}
        removeWallMode={removeWallMode}
        onRemoveWall={onRemoveWall}
      />

      {measureMode && (
        <mesh position={[centerX, 0.005, centerZ]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleMeasureClick}>
          <planeGeometry args={[Math.max(spanW, spanD) * 4, Math.max(spanW, spanD) * 4]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
      {measurePoints.map((p, i) => (
        <mesh key={i} position={[inchesToScene(p.x), 0.08, inchesToScene(p.z)]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      ))}
      {measurePoints.length === 2 && (
        <group>
          <Line
            points={[
              [inchesToScene(measurePoints[0].x), 0.08, inchesToScene(measurePoints[0].z)],
              [inchesToScene(measurePoints[1].x), 0.08, inchesToScene(measurePoints[1].z)],
            ]}
            color="#f59e0b"
            lineWidth={2.5}
          />
          {/* Billboard so the reading always faces the camera — a flat Text plane is edge-on
              (and effectively invisible) from a typical top-down orbit angle. */}
          <Billboard
            position={[
              inchesToScene((measurePoints[0].x + measurePoints[1].x) / 2),
              1.6,
              inchesToScene((measurePoints[0].z + measurePoints[1].z) / 2),
            ]}
          >
            <Text
              fontSize={0.8}
              color="#ffb020"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.06}
              outlineColor="#101010"
            >
              {formatInches(
                Math.hypot(measurePoints[1].x - measurePoints[0].x, measurePoints[1].z - measurePoints[0].z),
              )}
            </Text>
          </Billboard>
        </group>
      )}

      {items.map((item) => {
        const catalog = getCatalogItem(item.catalogItemId);
        if (!catalog) return null;
        return (
          <FurnitureItem3D
            key={item.id}
            item={item}
            catalog={catalog}
            windowFrameHex={style.windowFrameHex}
            held={item.id === heldItemId}
            heldBlocked={item.id === heldItemId && !canPlaceHeld}
            selected={item.id === selectedItemId && cameraMode !== 'walk'}
            onSelect={() => onSelect(item.id)}
            onDragStart={
              cameraMode === 'orbit' && transformMode === 'translate' ? () => handleDragStart(item.id) : undefined
            }
            groupRef={(g) => {
              if (g) itemRefs.current[item.id] = g;
              else delete itemRefs.current[item.id];
            }}
            onSelectedRef={setSelectedObject}
          />
        );
      })}

      {/* One floor-level drag plane for everything. Wall-mounted items re-home to whichever wall
          is nearest the pointer, so a doorway can be dragged from one wall to any other. */}
      {draggingId && (
        <mesh
          position={[centerX, 0, centerZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={draggingWall ? handleWallDragMove : handleFloorDragMove}
          onPointerUp={handleDragEnd}
        >
          <planeGeometry args={[Math.max(spanW, spanD) * 4, Math.max(spanW, spanD) * 4]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {cameraMode === 'orbit' && transformMode === 'rotate' && selectedObject && (
        <TransformControls
          ref={transformRef}
          object={selectedObject}
          mode="rotate"
          showX={false}
          showY
          showZ={false}
          onObjectChange={handleObjectChange}
        />
      )}

      <CameraRig
        mode={cameraMode}
        target={[centerX, 0, centerZ]}
        walkSpawnTarget={walkSpawnTarget}
        walkLookDir={walkLookDir}
        bounds={bounds}
        walls={layout.walls}
        items={items}
        heldItemId={heldItemId}
        orbitControlsRef={orbitRef}
      />

      <WalkPlacement
        enabled={cameraMode === 'walk'}
        layout={layout}
        ceilingHeightIn={ceilingHeightIn}
        items={items}
        heldItemId={heldItemId}
        onHeldChange={onHeldChange}
        onDeleteItem={onDeleteItem}
        onLiveTransform={onLiveTransform}
        onCommitTransform={onCommitTransform}
        onHoverChange={onWalkHoverChange}
        onCanPlaceChange={onCanPlaceChange}
      />
    </Canvas>
  );
});
