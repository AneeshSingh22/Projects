import { useEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import type { CatalogItem, PlacedItem } from '../../types';
import { effectiveDimensions } from '../../lib/geometry';
import { makeRugTexture } from '../../lib/styleTextures';
import { inchesToScene } from '../../lib/units';

type Dims = { w: number; d: number; h: number };

const WOOD_DARK = '#4a3826';
const METAL = '#3a3a3c';
const FABRIC_ROUGHNESS = 0.95;

function clampRadius(r: number, ...dims: number[]) {
  return Math.max(0.01, Math.min(r, Math.min(...dims) / 2 - 0.001));
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const r = c(((n >> 16) & 255) + amt * 255);
  const g = c(((n >> 8) & 255) + amt * 255);
  const b = c((n & 255) + amt * 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Legs({
  w,
  d,
  y,
  legH,
  color = METAL,
  taper = true,
}: {
  w: number;
  d: number;
  y: number;
  legH: number;
  color?: string;
  taper?: boolean;
}) {
  const inset = Math.min(w, d) * 0.12;
  const positions: [number, number][] = [
    [w / 2 - inset, d / 2 - inset],
    [-(w / 2 - inset), d / 2 - inset],
    [w / 2 - inset, -(d / 2 - inset)],
    [-(w / 2 - inset), -(d / 2 - inset)],
  ];
  const r = Math.min(w, d) * 0.025 + 0.02;
  return (
    <>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[r * (taper ? 0.7 : 1), r, legH, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </>
  );
}

function Sofa({ w, d, h, color }: Dims & { color: string }) {
  const legH = h * 0.12;
  const baseH = h * 0.28;
  const seatH = h * 0.18;
  const backT = d * 0.22;
  const armW = Math.min(w * 0.11, 0.7);
  const cushions = w > 5 ? 3 : 2;
  const cushionW = (w - armW * 2) / cushions;
  const darker = shade(color, -0.08);
  return (
    <group>
      <Legs w={w} d={d} y={legH / 2} legH={legH} />
      {/* base frame */}
      <RoundedBox args={[w, baseH, d]} radius={clampRadius(0.06, w, baseH, d)} smoothness={3} position={[0, legH + baseH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={darker} roughness={FABRIC_ROUGHNESS} />
      </RoundedBox>
      {/* seat cushions */}
      {Array.from({ length: cushions }).map((_, i) => (
        <RoundedBox
          key={`s${i}`}
          args={[cushionW * 0.96, seatH, d * 0.94 - backT * 0.5]}
          radius={clampRadius(0.08, cushionW, seatH, d * 0.5)}
          smoothness={3}
          position={[-w / 2 + armW + cushionW * (i + 0.5), legH + baseH + seatH / 2, backT * 0.25]}
          castShadow
        >
          <meshStandardMaterial color={color} roughness={FABRIC_ROUGHNESS} />
        </RoundedBox>
      ))}
      {/* back cushions */}
      {Array.from({ length: cushions }).map((_, i) => (
        <RoundedBox
          key={`b${i}`}
          args={[cushionW * 0.96, h - legH - baseH, backT]}
          radius={clampRadius(0.09, cushionW, h * 0.4, backT)}
          smoothness={3}
          position={[-w / 2 + armW + cushionW * (i + 0.5), legH + baseH + (h - legH - baseH) / 2, -d / 2 + backT / 2]}
          castShadow
        >
          <meshStandardMaterial color={color} roughness={FABRIC_ROUGHNESS} />
        </RoundedBox>
      ))}
      {/* arms */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[armW, h * 0.72 - legH, d]}
          radius={clampRadius(0.09, armW, h * 0.4, d)}
          smoothness={3}
          position={[side * (w / 2 - armW / 2), legH + (h * 0.72 - legH) / 2, 0]}
          castShadow
        >
          <meshStandardMaterial color={darker} roughness={FABRIC_ROUGHNESS} />
        </RoundedBox>
      ))}
    </group>
  );
}

function ChairPrimitive({ w, d, h, color }: Dims & { color: string }) {
  const seatY = h * 0.46;
  const seatT = 0.12;
  return (
    <group>
      <Legs w={w * 0.9} d={d * 0.9} y={seatY / 2} legH={seatY} color={WOOD_DARK} />
      <RoundedBox args={[w, seatT, d]} radius={0.04} smoothness={3} position={[0, seatY + seatT / 2, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </RoundedBox>
      {/* back rest, slightly reclined */}
      <group position={[0, seatY + seatT, -d / 2 + 0.05]} rotation={[0.12, 0, 0]}>
        <RoundedBox args={[w * 0.92, h - seatY - seatT, 0.09]} radius={0.04} smoothness={3} position={[0, (h - seatY - seatT) / 2, 0]} castShadow>
          <meshStandardMaterial color={color} roughness={0.8} />
        </RoundedBox>
      </group>
    </group>
  );
}

function TableLike({ w, d, h, color }: Dims & { color: string }) {
  const topH = Math.max(h * 0.06, 0.08);
  const legH = h - topH;
  return (
    <group>
      <Legs w={w} d={d} y={legH / 2} legH={legH} color={METAL} taper={false} />
      <RoundedBox args={[w, topH, d]} radius={clampRadius(0.04, w, topH, d)} smoothness={3} position={[0, legH + topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.45} />
      </RoundedBox>
    </group>
  );
}

/** Solid carcass + drawer fronts + knobs (dresser, nightstand). */
function DrawerChest({ w, d, h, color, drawers }: Dims & { color: string; drawers: number }) {
  const legH = Math.min(h * 0.1, 0.35);
  const bodyH = h - legH;
  const gap = 0.035;
  const drawerH = (bodyH - gap * (drawers + 1)) / drawers;
  return (
    <group>
      <Legs w={w} d={d} y={legH / 2} legH={legH} />
      <RoundedBox args={[w, bodyH, d]} radius={clampRadius(0.05, w, bodyH, d)} smoothness={3} position={[0, legH + bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      {Array.from({ length: drawers }).map((_, i) => {
        const y = legH + gap + drawerH * (i + 0.5) + gap * i;
        return (
          <group key={i}>
            <RoundedBox args={[w * 0.92, drawerH, 0.05]} radius={0.02} smoothness={2} position={[0, y, d / 2 + 0.01]} castShadow>
              <meshStandardMaterial color={shade(color, 0.06)} roughness={0.55} />
            </RoundedBox>
            <mesh position={[0, y, d / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
              <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Low media cabinet with sliding door fronts. */
function TvStand({ w, d, h, color }: Dims & { color: string }) {
  const legH = Math.min(h * 0.18, 0.4);
  const bodyH = h - legH;
  return (
    <group>
      <Legs w={w} d={d} y={legH / 2} legH={legH} />
      <RoundedBox args={[w, bodyH, d]} radius={clampRadius(0.04, w, bodyH, d)} smoothness={3} position={[0, legH + bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.5} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[w * 0.44, bodyH * 0.82, 0.04]}
          radius={0.02}
          smoothness={2}
          position={[side * w * 0.235, legH + bodyH / 2, d / 2 + 0.01]}
          castShadow
        >
          <meshStandardMaterial color={shade(color, -0.1)} roughness={0.5} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Bookshelf({ w, d, h, color }: Dims & { color: string }) {
  const t = 0.07;
  const shelfCount = Math.max(3, Math.round(h / 1.2));
  const innerH = h - t * 2;
  const rng = seededRng(41);
  const bookColors = ['#8a4a3a', '#3a5a7a', '#5a7a4a', '#9a8a5a', '#6a4a7a', '#a06a4a'];
  return (
    <group>
      {/* sides, top, bottom, back */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 - t / 2), h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, h - t / 2, 0]} castShadow>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, t / 2, 0]} castShadow>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color={shade(color, -0.12)} roughness={0.7} />
      </mesh>
      {/* shelves + books */}
      {Array.from({ length: shelfCount - 1 }).map((_, i) => {
        const y = t + (innerH * (i + 1)) / shelfCount;
        return (
          <mesh key={i} position={[0, y, 0]} castShadow>
            <boxGeometry args={[w - t * 2, 0.05, d - 0.06]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        );
      })}
      {Array.from({ length: shelfCount }).map((_, si) => {
        const shelfY = t + (innerH * si) / shelfCount;
        const slots = Math.floor((w - t * 2) / 0.22);
        return (
          <group key={si}>
            {Array.from({ length: slots }).map((_, bi) => {
              if (rng() < 0.35) return null; // gaps between book runs
              const bw = 0.1 + rng() * 0.1;
              const bh = 0.55 + rng() * 0.35;
              const x = -w / 2 + t + 0.12 + bi * 0.22;
              return (
                <mesh key={bi} position={[x, shelfY + 0.05 + bh / 2, -d * 0.08]} castShadow>
                  <boxGeometry args={[bw, bh, d * 0.6]} />
                  <meshStandardMaterial color={bookColors[Math.floor(rng() * bookColors.length)]} roughness={0.85} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function Box({ w, d, h, color }: Dims & { color: string }) {
  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function Bed({ w, d, h, color }: Dims & { color: string }) {
  const frameH = h * 0.3;
  const mattressH = h * 0.3;
  const duvetT = 0.09;
  return (
    <group>
      {/* platform + headboard */}
      <RoundedBox args={[w, frameH, d]} radius={0.05} smoothness={3} position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[w, h * 1.15, 0.12]} radius={0.05} smoothness={3} position={[0, h * 0.55, -d / 2 - 0.04]} castShadow>
        <meshStandardMaterial color={shade(WOOD_DARK, 0.05)} roughness={0.75} />
      </RoundedBox>
      {/* mattress */}
      <RoundedBox args={[w * 0.96, mattressH, d * 0.96]} radius={clampRadius(0.09, w * 0.5, mattressH, d * 0.5)} smoothness={4} position={[0, frameH + mattressH / 2, 0]} castShadow>
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </RoundedBox>
      {/* duvet over the lower 2/3 */}
      <RoundedBox
        args={[w * 0.99, duvetT * 2, d * 0.62]}
        radius={0.08}
        smoothness={4}
        position={[0, frameH + mattressH + duvetT * 0.4, d * 0.17]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={FABRIC_ROUGHNESS} />
      </RoundedBox>
      {/* pillows */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[w * 0.38, 0.16, d * 0.16]}
          radius={0.07}
          smoothness={4}
          position={[side * w * 0.22, frameH + mattressH + 0.09, -d / 2 + d * 0.14]}
          rotation={[0.25, 0, 0]}
          castShadow
        >
          <meshStandardMaterial color="#faf8f2" roughness={0.9} />
        </RoundedBox>
      ))}
    </group>
  );
}

/** A real woven rug: a thin slab (so it has an edge you can see from eye level) surfaced with a
 * generated pile/weave texture, plus knotted fringe along the two short ends. */
function Rug({ w, d, color }: Dims & { color: string }) {
  const texture = useMemo(() => makeRugTexture(color), [color]);
  useEffect(() => () => texture.dispose(), [texture]);

  const thickness = 0.055;
  const fringeLen = Math.min(0.28, d * 0.05);
  const strands = Math.max(8, Math.round(w / 0.12));

  return (
    <group>
      {/* body — a slab rather than a plane, so the pile has visible depth at floor level */}
      <mesh position={[0, thickness / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial map={texture} roughness={0.98} />
      </mesh>
      {/* fringe on both short ends */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: strands }).map((_, i) => {
            const x = -w / 2 + ((i + 0.5) / strands) * w;
            const jitter = ((i * 37) % 11) / 11;
            const len = fringeLen * (0.7 + jitter * 0.5);
            return (
              <mesh
                key={i}
                position={[x, thickness * 0.45, side * (d / 2 + len / 2)]}
                rotation={[0, (jitter - 0.5) * 0.25, 0]}
              >
                <boxGeometry args={[w / strands / 2.4, thickness * 0.55, len]} />
                <meshStandardMaterial color={shade(color, 0.16)} roughness={1} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Lamp({ w, h, color }: Dims & { color: string }) {
  const poleR = Math.max(w * 0.04, 0.025);
  return (
    <group>
      <mesh position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[w * 0.32, w * 0.36, 0.05, 20]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, h * 0.45, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, h * 0.82, 10]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, h * 0.87, 0]} castShadow>
        <cylinderGeometry args={[w * 0.32, w * 0.45, h * 0.22, 20, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.8} side={2} emissive="#ffedc9" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Plant({ w, h, color }: Dims & { color: string }) {
  const potH = h * 0.28;
  const rng = seededRng(23);
  const blobs = 5;
  return (
    <group>
      <mesh position={[0, potH / 2, 0]} castShadow>
        <cylinderGeometry args={[w * 0.32, w * 0.24, potH, 14]} />
        <meshStandardMaterial color="#b8b0a4" roughness={0.8} />
      </mesh>
      <mesh position={[0, potH + h * 0.12, 0]} castShadow>
        <cylinderGeometry args={[w * 0.035, w * 0.05, h * 0.3, 8]} />
        <meshStandardMaterial color="#6a5138" roughness={0.9} />
      </mesh>
      {Array.from({ length: blobs }).map((_, i) => {
        const angle = (i / blobs) * Math.PI * 2;
        const spread = w * (0.12 + rng() * 0.16);
        const y = potH + h * (0.42 + rng() * 0.3);
        return (
          <mesh key={i} position={[Math.cos(angle) * spread, y, Math.sin(angle) * spread]} castShadow>
            <icosahedronGeometry args={[w * (0.2 + rng() * 0.14), 1]} />
            <meshStandardMaterial color={shade(color, (rng() - 0.5) * 0.16)} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Tv({ w, h, color }: Dims & { color: string }) {
  return (
    <group>
      <RoundedBox args={[w, h, 0.05]} radius={0.02} smoothness={2} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, h / 2, 0.028]}>
        <boxGeometry args={[w * 0.96, h * 0.92, 0.006]} />
        <meshStandardMaterial color="#05090f" roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Painting({ w, h, color }: Dims & { color: string }) {
  return (
    <group>
      <RoundedBox args={[w, h, 0.06]} radius={0.015} smoothness={2} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color="#2e261c" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, h / 2, 0.032]}>
        <boxGeometry args={[w * 0.88, h * 0.88, 0.01]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </mesh>
      <mesh position={[0, h / 2, 0.04]}>
        <boxGeometry args={[w * 0.72, h * 0.72, 0.008]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** The wall itself is carved open for the doorway (see ApartmentShell) — this is just the
 * frame/trim tracing the opening, so it stays visible and clickable to reposition/resize. */
function Doorway({ w, h, color }: Dims & { color: string }) {
  const jambT = Math.min(w, h) * 0.05 + 0.02;
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 - jambT / 2), h / 2, 0]} castShadow>
          <boxGeometry args={[jambT, h, 0.09]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, h - jambT / 2, 0]} castShadow>
        <boxGeometry args={[w, jambT, 0.09]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[w, 0.02, 0.14]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Glass opening set into the wall cut (see ApartmentShell). Wide spans read as a window wall /
 * sliding door: thin dark frame, vertical mullions every ~2.5ft, barely-there glass. */
function Window({ w, h, frameHex }: Dims & { frameHex: string }) {
  const frameT = 0.09;
  const mullions = Math.max(0, Math.round(w / 2.5) - 1);
  return (
    <group>
      {/* perimeter frame */}
      {[-1, 1].map((side) => (
        <mesh key={`v${side}`} position={[side * (w / 2 - frameT / 2), h / 2, 0]} castShadow>
          <boxGeometry args={[frameT, h, 0.14]} />
          <meshStandardMaterial color={frameHex} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {[
        [h - frameT / 2, w],
        [frameT / 2, w],
      ].map(([y, ww], i) => (
        <mesh key={`h${i}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[ww, frameT, 0.14]} />
          <meshStandardMaterial color={frameHex} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {/* vertical mullions */}
      {Array.from({ length: mullions }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (w * (i + 1)) / (mullions + 1), h / 2, 0]} castShadow>
          <boxGeometry args={[0.05, h - frameT * 2, 0.1]} />
          <meshStandardMaterial color={frameHex} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {/* glass */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w - frameT * 2, h - frameT * 2, 0.02]} />
        <meshStandardMaterial color="#cfe6f2" transparent opacity={0.16} roughness={0.05} metalness={0.2} />
      </mesh>
    </group>
  );
}

const COUNTERTOP = '#ddd8ce';
const STAINLESS = '#b8bcbf';
const PORCELAIN = '#f6f5f1';

/** Base cabinets + countertop with a toe-kick recess and door seams. Back sits against a wall. */
function KitchenCounter({ w, d, h, color }: Dims & { color: string }) {
  const kickH = 0.3;
  const topT = 0.12;
  const bodyH = h - kickH - topT;
  const doors = Math.max(2, Math.round(w / 1.8));
  return (
    <group>
      <mesh position={[0, kickH / 2, -0.08]} receiveShadow>
        <boxGeometry args={[w * 0.97, kickH, d - 0.16]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.8} />
      </mesh>
      <RoundedBox args={[w, bodyH, d - 0.05]} radius={0.02} smoothness={2} position={[0, kickH + bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.5} />
      </RoundedBox>
      {/* door seams + handles */}
      {Array.from({ length: doors - 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (w * (i + 1)) / doors, kickH + bodyH / 2, d / 2 - 0.01]}>
          <boxGeometry args={[0.015, bodyH * 0.92, 0.02]} />
          <meshStandardMaterial color={shade(color, -0.25)} />
        </mesh>
      ))}
      {Array.from({ length: doors }).map((_, i) => (
        <mesh key={`h${i}`} position={[-w / 2 + (w * (i + 0.5)) / doors, kickH + bodyH * 0.82, d / 2 + 0.02]} castShadow>
          <boxGeometry args={[0.28, 0.035, 0.035]} />
          <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <RoundedBox args={[w + 0.06, topT, d + 0.06]} radius={0.02} smoothness={2} position={[0, h - topT / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={COUNTERTOP} roughness={0.25} />
      </RoundedBox>
    </group>
  );
}

function KitchenIsland({ w, d, h, color }: Dims & { color: string }) {
  return (
    <group>
      <KitchenCounter w={w} d={d} h={h} color={color} />
      {/* seating overhang on the front edge */}
      <RoundedBox args={[w + 0.06, 0.12, 0.9]} radius={0.02} smoothness={2} position={[0, h - 0.06, d / 2 + 0.42]} castShadow>
        <meshStandardMaterial color={COUNTERTOP} roughness={0.25} />
      </RoundedBox>
    </group>
  );
}

function Fridge({ w, d, h }: Dims & { color: string }) {
  const freezerSplit = h * 0.62;
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={STAINLESS} metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, freezerSplit, d / 2 + 0.005]}>
        <boxGeometry args={[w * 0.98, 0.02, 0.01]} />
        <meshStandardMaterial color="#7d8184" />
      </mesh>
      {[freezerSplit + (h - freezerSplit) / 2, freezerSplit / 2 + h * 0.05].map((y, i) => (
        <mesh key={i} position={[w * 0.32, y, d / 2 + 0.045]} castShadow>
          <boxGeometry args={[0.05, i === 0 ? (h - freezerSplit) * 0.6 : freezerSplit * 0.45, 0.05]} />
          <meshStandardMaterial color="#888c8f" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Stove({ w, d, h }: Dims & { color: string }) {
  const topT = 0.06;
  return (
    <group>
      <RoundedBox args={[w, h - topT, d]} radius={0.02} smoothness={2} position={[0, (h - topT) / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={STAINLESS} metalness={0.5} roughness={0.4} />
      </RoundedBox>
      {/* oven window + handle */}
      <mesh position={[0, h * 0.42, d / 2 + 0.005]}>
        <boxGeometry args={[w * 0.7, h * 0.32, 0.01]} />
        <meshStandardMaterial color="#1c1e20" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0, h * 0.78, d / 2 + 0.05]} castShadow>
        <boxGeometry args={[w * 0.85, 0.05, 0.05]} />
        <meshStandardMaterial color="#888c8f" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* black cooktop with burners */}
      <mesh position={[0, h - topT / 2, 0]} castShadow>
        <boxGeometry args={[w, topT, d]} />
        <meshStandardMaterial color="#141618" roughness={0.15} metalness={0.3} />
      </mesh>
      {([[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]] as const).map(([fx, fz], i) => (
        <mesh key={i} position={[fx * w, h + 0.002, fz * d]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[w * 0.07, w * 0.1, 24]} />
          <meshStandardMaterial color="#3a3d40" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function WasherDryer({ w, d, h }: Dims & { color: string }) {
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.04} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#eceff0" roughness={0.35} metalness={0.15} />
      </RoundedBox>
      {/* round door */}
      <mesh position={[0, h * 0.45, d / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[Math.min(w, h) * 0.32, Math.min(w, h) * 0.32, 0.04, 28]} />
        <meshStandardMaterial color="#9aa0a4" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, h * 0.45, d / 2 + 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[Math.min(w, h) * 0.24, Math.min(w, h) * 0.24, 0.02, 28]} />
        <meshStandardMaterial color="#1a2126" roughness={0.1} metalness={0.4} />
      </mesh>
      {/* control panel */}
      <mesh position={[0, h * 0.9, d / 2 + 0.005]}>
        <boxGeometry args={[w * 0.9, h * 0.1, 0.01]} />
        <meshStandardMaterial color="#c8ccce" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Toilet({ w, d, h }: Dims & { color: string }) {
  const bowlH = h * 0.55;
  const tankH = h * 0.45;
  return (
    <group>
      {/* tank against the wall (back = -z) */}
      <RoundedBox args={[w, tankH, d * 0.28]} radius={0.04} smoothness={3} position={[0, bowlH + tankH / 2 - 0.1, -d / 2 + d * 0.14]} castShadow>
        <meshStandardMaterial color={PORCELAIN} roughness={0.25} />
      </RoundedBox>
      {/* bowl — elongated */}
      <mesh position={[0, bowlH * 0.55, d * 0.1]} scale={[1, 1, 1.5]} castShadow>
        <cylinderGeometry args={[w * 0.42, w * 0.3, bowlH * 0.9, 18]} />
        <meshStandardMaterial color={PORCELAIN} roughness={0.25} />
      </mesh>
      {/* seat */}
      <mesh position={[0, bowlH + 0.02, d * 0.1]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[w * 0.46, w * 0.46, 0.05, 20]} />
        <meshStandardMaterial color={PORCELAIN} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Vanity({ w, d, h, color }: Dims & { color: string }) {
  const topT = 0.1;
  const bodyH = h - topT;
  return (
    <group>
      <RoundedBox args={[w, bodyH, d]} radius={0.02} smoothness={2} position={[0, bodyH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[w + 0.05, topT, d + 0.05]} radius={0.02} smoothness={2} position={[0, h - topT / 2, 0]} castShadow>
        <meshStandardMaterial color={PORCELAIN} roughness={0.2} />
      </RoundedBox>
      {/* basin + faucet */}
      <mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.16, w * 0.22, 24]} />
        <meshStandardMaterial color="#d5d2ca" roughness={0.3} />
      </mesh>
      <mesh position={[0, h + 0.12, -d * 0.3]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 10]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* mirror above (wall side) */}
      <mesh position={[0, h + 1.6, -d / 2 + 0.02]} castShadow>
        <boxGeometry args={[w * 0.85, 2.2, 0.04]} />
        <meshStandardMaterial color="#c8dbe4" roughness={0.05} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Bathtub({ w, d, h }: Dims & { color: string }) {
  const rimT = 0.18;
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.08} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PORCELAIN} roughness={0.2} />
      </RoundedBox>
      {/* basin cavity */}
      <mesh position={[0, h - 0.04, 0]}>
        <boxGeometry args={[w - rimT * 2, 0.09, d - rimT * 2]} />
        <meshStandardMaterial color="#e3e1db" roughness={0.25} />
      </mesh>
      {/* faucet at one end */}
      <mesh position={[-w / 2 + rimT / 2 + 0.06, h + 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 10]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Shower({ w, d, h, frameHex = '#9aa0a4' }: Dims & { color: string; frameHex?: string }) {
  const trayH = 0.18;
  return (
    <group>
      <RoundedBox args={[w, trayH, d]} radius={0.04} smoothness={2} position={[0, trayH / 2, 0]} receiveShadow>
        <meshStandardMaterial color={PORCELAIN} roughness={0.3} />
      </RoundedBox>
      {/* glass on the two exposed sides (front +z and right +x); back/left face walls */}
      <mesh position={[0, h / 2, d / 2 - 0.02]}>
        <boxGeometry args={[w, h - trayH, 0.025]} />
        <meshStandardMaterial color="#cfe2ea" transparent opacity={0.22} roughness={0.05} />
      </mesh>
      <mesh position={[w / 2 - 0.02, h / 2, 0]}>
        <boxGeometry args={[0.025, h - trayH, d]} />
        <meshStandardMaterial color="#cfe2ea" transparent opacity={0.22} roughness={0.05} />
      </mesh>
      {/* chrome trim + shower head */}
      <mesh position={[0, h - 0.05, d / 2 - 0.02]}>
        <boxGeometry args={[w, 0.05, 0.05]} />
        <meshStandardMaterial color={frameHex} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, h - 0.5, -d / 2 + 0.15]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.05, 0.28, 12]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function GeometryByKind({
  kind,
  dims,
  color,
  windowFrameHex,
}: {
  kind: CatalogItem['geometry']['kind'];
  dims: Dims;
  color: string;
  windowFrameHex: string;
}) {
  switch (kind) {
    case 'sofa':
    case 'armchair':
      return <Sofa {...dims} color={color} />;
    case 'chair':
      return <ChairPrimitive {...dims} color={color} />;
    case 'coffeeTable':
    case 'sideTable':
    case 'diningTable':
    case 'desk':
      return <TableLike {...dims} color={color} />;
    case 'nightstand':
      return <DrawerChest {...dims} color={color} drawers={2} />;
    case 'dresser':
      return <DrawerChest {...dims} color={color} drawers={3} />;
    case 'tvStand':
      return <TvStand {...dims} color={color} />;
    case 'bookshelf':
      return <Bookshelf {...dims} color={color} />;
    case 'bed':
      return <Bed {...dims} color={color} />;
    case 'rug':
      return <Rug {...dims} color={color} />;
    case 'lamp':
      return <Lamp {...dims} color={color} />;
    case 'plant':
      return <Plant {...dims} color={color} />;
    case 'tv':
      return <Tv {...dims} color={color} />;
    case 'painting':
      return <Painting {...dims} color={color} />;
    case 'window':
      return <Window {...dims} frameHex={windowFrameHex} />;
    case 'doorway':
      return <Doorway {...dims} color={color} />;
    case 'kitchenCounter':
      return <KitchenCounter {...dims} color={color} />;
    case 'kitchenIsland':
      return <KitchenIsland {...dims} color={color} />;
    case 'fridge':
      return <Fridge {...dims} color={color} />;
    case 'stove':
      return <Stove {...dims} color={color} />;
    case 'washerDryer':
      return <WasherDryer {...dims} color={color} />;
    case 'toilet':
      return <Toilet {...dims} color={color} />;
    case 'vanity':
      return <Vanity {...dims} color={color} />;
    case 'bathtub':
      return <Bathtub {...dims} color={color} />;
    case 'shower':
      return <Shower {...dims} color={color} />;
    case 'box':
    default:
      return <Box {...dims} color={color} />;
  }
}

export function FurnitureItem3D({
  item,
  catalog,
  selected,
  onSelect,
  onDragStart,
  groupRef,
  onSelectedRef,
  windowFrameHex = '#2a2a2a',
  held = false,
  heldBlocked = false,
}: {
  item: PlacedItem;
  catalog: CatalogItem;
  selected: boolean;
  /** carried in first-person walk mode — rendered as a translucent placement ghost */
  held?: boolean;
  /** held item is somewhere it can't be dropped (clipping furniture / outside a room) */
  heldBlocked?: boolean;
  onSelect: () => void;
  /** Present only when direct-drag is currently allowed (orbit camera + Move mode). */
  onDragStart?: () => void;
  groupRef?: (g: Group | null) => void;
  /** Called with this item's Object3D whenever it becomes the selection, and with null when it stops being. */
  onSelectedRef?: (g: Group | null) => void;
  /** Window frame color from the room's style profile. */
  windowFrameHex?: string;
}) {
  const dimsIn = effectiveDimensions(item, catalog.defaultDimensions);
  const dims: Dims = useMemo(
    () => ({
      w: inchesToScene(dimsIn.widthIn),
      d: inchesToScene(dimsIn.depthIn),
      h: inchesToScene(dimsIn.heightIn),
    }),
    [dimsIn.widthIn, dimsIn.depthIn, dimsIn.heightIn],
  );

  const localRef = useRef<Group>(null);

  useEffect(() => {
    if (!selected) return;
    onSelectedRef?.(localRef.current);
    return () => onSelectedRef?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const verticalOffset = item.wallMounted
    ? inchesToScene(item.wallMounted.heightOffsetIn) - dims.h / 2
    : 0;

  return (
    <group
      ref={(g) => {
        localRef.current = g;
        groupRef?.(g);
      }}
      position={[inchesToScene(item.x), verticalOffset, inchesToScene(item.z)]}
      rotation={[0, item.rotationY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onDragStart?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (onDragStart) document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* While carried, the whole item renders semi-transparent so you can see the floor and
          furniture it would land on — the placement "ghost". */}
      <group>
        <GeometryByKind kind={catalog.geometry.kind} dims={dims} color={item.color ?? catalog.color} windowFrameHex={windowFrameHex} />
      </group>
      {held && (
        <>
          <mesh position={[0, dims.h / 2, 0]}>
            <boxGeometry args={[dims.w + 0.06, dims.h + 0.06, dims.d + 0.06]} />
            <meshBasicMaterial
              color={heldBlocked ? '#f43f5e' : '#22d3ee'}
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[dims.w, dims.d]} />
            <meshBasicMaterial
              color={heldBlocked ? '#f43f5e' : '#22d3ee'}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      {selected && (
        <mesh position={[0, dims.h / 2, 0]}>
          <boxGeometry args={[dims.w + 0.04, dims.h + 0.04, dims.d + 0.04]} />
          <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
