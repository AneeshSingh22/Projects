import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Grid, Text } from '@react-three/drei';
import type { PlacedItem, Point2D, RoomLayout, SpaceStyleOverride, StyleProfile, Wall } from '../../types';
import { getCatalogItem } from '../../data/furnitureCatalog';
import { effectiveDimensions } from '../../lib/geometry';
import { apartmentBounds, polygonCentroid, wallLength } from '../../lib/floorPlan';
import { makeFloorTexture, TEXTURE_PATCH_FT } from '../../lib/styleTextures';
import { inchesToScene } from '../../lib/units';

function FloorShape({ polygon, texture }: { polygon: Point2D[]; texture: THREE.CanvasTexture }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    polygon.forEach((p, i) => {
      const x = inchesToScene(p.x);
      const y = inchesToScene(p.z);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
    s.closePath();
    return s;
  }, [polygon]);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      {/* ShapeGeometry UVs are the raw vertex coords (scene units = feet); one texture tile
          covers TEXTURE_PATCH_FT feet, so this repeat maps it 1:1 to real-world scale. */}
      <meshStandardMaterial
        map={texture}
        map-repeat={[1 / TEXTURE_PATCH_FT, 1 / TEXTURE_PATCH_FT]}
        roughness={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** One rendered box of a wall: a horizontal span [startIn, endIn] and a vertical band
 * [yFromIn, yToIn]. Door gaps remove the band below the door head; window gaps remove the band
 * between sill and head, leaving wall below and above. */
interface WallPiece {
  startIn: number;
  endIn: number;
  yFromIn: number;
  yToIn: number;
}

function WallMesh({
  wall,
  heightIn,
  opacity,
  items,
  style,
  wallHex,
  removable,
  highlighted,
  onHover,
  onRemove,
}: {
  wall: Wall;
  heightIn: number;
  opacity: number;
  items: PlacedItem[];
  style: StyleProfile;
  /** effective paint color for this wall (may be a per-room override) */
  wallHex: string;
  /** remove-wall tool is active: show a hit target and react to hover */
  removable: boolean;
  highlighted: boolean;
  onHover: (hovering: boolean) => void;
  onRemove: () => void;
}) {
  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.z - wall.a.z;
  const len = wallLength(wall);
  const angle = Math.atan2(dx, dz);
  const t = wall.thicknessIn;

  const gaps = items
    .filter((it) => it.wallMounted?.wallId === wall.id)
    .map((it) => {
      const catalog = getCatalogItem(it.catalogItemId);
      if (!catalog?.cutsWall) return null;
      const dims = effectiveDimensions(it, catalog.defaultDimensions);
      const offsetIn = it.wallMounted!.offsetIn;
      return {
        startIn: Math.max(0, offsetIn - dims.widthIn / 2),
        endIn: Math.min(len, offsetIn + dims.widthIn / 2),
        gapBottomIn: Math.max(0, it.wallMounted!.heightOffsetIn - dims.heightIn / 2),
        gapTopIn: Math.min(heightIn, it.wallMounted!.heightOffsetIn + dims.heightIn / 2),
      };
    })
    .filter((g): g is { startIn: number; endIn: number; gapBottomIn: number; gapTopIn: number } => !!g)
    .sort((a, b) => a.startIn - b.startIn);

  const pieces: WallPiece[] = [];
  let cursor = 0;
  for (const gap of gaps) {
    if (gap.startIn > cursor) pieces.push({ startIn: cursor, endIn: gap.startIn, yFromIn: 0, yToIn: heightIn });
    if (gap.gapBottomIn > 0.5) pieces.push({ startIn: gap.startIn, endIn: gap.endIn, yFromIn: 0, yToIn: gap.gapBottomIn });
    if (heightIn - gap.gapTopIn > 0.5)
      pieces.push({ startIn: gap.startIn, endIn: gap.endIn, yFromIn: gap.gapTopIn, yToIn: heightIn });
    cursor = Math.max(cursor, gap.endIn);
  }
  if (cursor < len) pieces.push({ startIn: cursor, endIn: len, yFromIn: 0, yToIn: heightIn });

  const wallMidX = (wall.a.x + wall.b.x) / 2;
  const wallMidZ = (wall.a.z + wall.b.z) / 2;
  const bbH = style.baseboardHeightIn;

  return (
    <group position={[inchesToScene(wallMidX), 0, inchesToScene(wallMidZ)]} rotation={[0, angle, 0]}>
      {pieces.map((piece, i) => {
        if (piece.endIn - piece.startIn < 0.5 || piece.yToIn - piece.yFromIn < 0.5) return null;
        // Extend the wall's own outer ends by half its thickness (only at the true start/end of
        // the wall) so it overlaps adjoining walls at the corner instead of leaving a gap.
        const extendStart = piece.startIn <= 0.01 ? t / 2 : 0;
        const extendEnd = piece.endIn >= len - 0.01 ? t / 2 : 0;
        const startIn = piece.startIn - extendStart;
        const endIn = piece.endIn + extendEnd;
        const midOffset = (startIn + endIn) / 2;
        // Local Z is the distance along the wall's own direction from its midpoint.
        const localZ = inchesToScene(midOffset - len / 2);
        const spanIn = endIn - startIn;
        return (
          <group key={i}>
            <mesh position={[0, inchesToScene((piece.yFromIn + piece.yToIn) / 2), localZ]} castShadow receiveShadow>
              <boxGeometry
                args={[inchesToScene(t), inchesToScene(piece.yToIn - piece.yFromIn), inchesToScene(spanIn)]}
              />
              <meshStandardMaterial
                color={highlighted ? '#ef4444' : wallHex}
                emissive={highlighted ? '#7f1d1d' : '#000000'}
                emissiveIntensity={highlighted ? 0.6 : 0}
                roughness={0.92}
                transparent
                opacity={opacity}
                depthWrite={opacity > 0.5}
              />
            </mesh>
            {/* baseboard along any floor-level piece, slightly proud of the wall face */}
            {piece.yFromIn === 0 && opacity > 0.5 && (
              <mesh position={[0, inchesToScene(bbH / 2), localZ]} castShadow>
                <boxGeometry args={[inchesToScene(t + 1.2), inchesToScene(bbH), inchesToScene(spanIn)]} />
                <meshStandardMaterial color={style.baseboardHex} roughness={0.6} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Invisible pick target, only while the remove-wall tool is on. One box for the whole wall
          means hovering a doorway gap still targets the wall it belongs to. */}
      {removable && (
        <mesh
          position={[0, inchesToScene(heightIn / 2), 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(true);
          }}
          onPointerOut={() => onHover(false)}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <boxGeometry
            args={[inchesToScene(Math.max(t, 6)), inchesToScene(heightIn), inchesToScene(len + t)]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function ApartmentShell({
  layout,
  ceilingHeightIn,
  wallOpacity,
  items,
  style,
  spaceStyles,
  showGrid,
  removeWallMode = false,
  onRemoveWall,
}: {
  layout: RoomLayout;
  ceilingHeightIn: number;
  wallOpacity: number;
  items: PlacedItem[];
  style: StyleProfile;
  /** per-space wall/floor overrides, keyed by space id */
  spaceStyles?: Record<string, SpaceStyleOverride>;
  showGrid: boolean;
  /** remove-wall tool active: walls highlight on hover and delete on click */
  removeWallMode?: boolean;
  onRemoveWall?: (wallId: string) => void;
}) {
  const bounds = apartmentBounds(layout);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  // Leaving the tool must clear the highlight, or a stale red wall lingers.
  useEffect(() => {
    if (!removeWallMode) setHoveredWallId(null);
  }, [removeWallMode]);

  // One texture per distinct floor finish: the apartment default plus every per-space override.
  const floorTextures = useMemo(() => {
    const textures = new Map<string, THREE.CanvasTexture>();
    textures.set('__default', makeFloorTexture(style));
    for (const [spaceId, override] of Object.entries(spaceStyles ?? {})) {
      if (override.floor) textures.set(spaceId, makeFloorTexture({ ...style, floor: override.floor }));
    }
    return textures;
  }, [style, spaceStyles]);
  useEffect(() => () => floorTextures.forEach((t) => t.dispose()), [floorTextures]);

  const wallHexFor = (wall: Wall): string => {
    for (const spaceId of wall.spaceIds) {
      const hex = spaceStyles?.[spaceId]?.wallHex;
      if (hex) return hex;
    }
    return style.wallHex;
  };

  return (
    <group>
      {layout.spaces.map((space) => (
        <group key={space.id}>
          <FloorShape polygon={space.polygon} texture={floorTextures.get(space.id) ?? floorTextures.get('__default')!} />
          {(() => {
            const c = polygonCentroid(space.polygon);
            return (
              <Text
                position={[inchesToScene(c.x), 0.02, inchesToScene(c.z)]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="#3c3121"
                anchorX="center"
                anchorY="middle"
                fillOpacity={0.5}
              >
                {space.name}
              </Text>
            );
          })()}
        </group>
      ))}

      {showGrid && (
        <Grid
          position={[inchesToScene(bounds.centerX), 0.01, inchesToScene(bounds.centerZ)]}
          args={[inchesToScene(bounds.width) + 4, inchesToScene(bounds.depth) + 4]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#333333"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#444444"
          fadeDistance={Math.max(inchesToScene(bounds.width), inchesToScene(bounds.depth)) * 2}
          infiniteGrid={false}
        />
      )}

      {layout.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          heightIn={ceilingHeightIn}
          opacity={wallOpacity}
          items={items}
          style={style}
          wallHex={wallHexFor(wall)}
          removable={removeWallMode}
          highlighted={removeWallMode && hoveredWallId === wall.id}
          onHover={(hovering) => setHoveredWallId(hovering ? wall.id : null)}
          onRemove={() => onRemoveWall?.(wall.id)}
        />
      ))}
    </group>
  );
}
