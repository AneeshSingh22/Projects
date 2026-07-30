import * as THREE from 'three';
import type { StyleProfile } from '../types';

/** Default finishes for rooms without an extracted style — a light-oak / white-wall look that
 * reads as a realistic empty apartment rather than a beige diagram. */
export const DEFAULT_STYLE: StyleProfile = {
  floor: { material: 'wood', colorHex: '#a97e58', accentHex: '#8f6847' },
  wallHex: '#f2f0ec',
  baseboardHex: '#d8d6d0',
  baseboardHeightIn: 4,
  windowFrameHex: '#2a2a2a',
  windowSillIn: 24,
  windowHeadIn: 90,
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color by a fraction. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const r = clamp01(((n >> 16) & 255) / 255 + amt);
  const g = clamp01(((n >> 8) & 255) / 255 + amt);
  const b = clamp01((n & 255) / 255 + amt);
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Deterministic pseudo-random, so the floor doesn't reshuffle on every re-render. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Every canvas covers a 4ft x 4ft patch of floor; the caller sets texture.repeat so one tile
// spans exactly 4 scene units (feet).
export const TEXTURE_PATCH_FT = 4;
const SIZE = 512;
const PX_PER_IN = SIZE / (TEXTURE_PATCH_FT * 12);

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function drawWood(ctx: CanvasRenderingContext2D, base: string, accent: string) {
  const rng = makeRng(7);
  const plankWIn = 6;
  const plankPx = plankWIn * PX_PER_IN;
  const rows = Math.ceil(SIZE / plankPx);
  for (let row = 0; row < rows; row++) {
    const y = row * plankPx;
    // Planks run along X with staggered end joints.
    let x = -rng() * SIZE * 0.6;
    while (x < SIZE) {
      const len = (24 + rng() * 36) * PX_PER_IN;
      const t = rng();
      ctx.fillStyle = t < 0.5 ? shade(base, (t - 0.25) * 0.07) : shade(accent, (t - 0.75) * 0.07);
      ctx.fillRect(x, y, len, plankPx);
      // grain: a few translucent streaks along the plank
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = y + (0.2 + 0.3 * g + rng() * 0.1) * plankPx;
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(x + len * 0.3, gy + rng() * 3 - 1.5, x + len * 0.7, gy + rng() * 3 - 1.5, x + len - 2, gy);
        ctx.stroke();
      }
      // end joint
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + len - 1, y, 1.5, plankPx);
      x += len;
    }
    // plank seam
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, y, SIZE, 1.2);
  }
}

function drawTile(ctx: CanvasRenderingContext2D, base: string, accent: string) {
  const rng = makeRng(11);
  const tileIn = 12;
  const tilePx = tileIn * PX_PER_IN;
  ctx.fillStyle = accent; // grout
  ctx.fillRect(0, 0, SIZE, SIZE);
  const grout = 2;
  for (let ty = 0; ty < SIZE / tilePx; ty++) {
    for (let tx = 0; tx < SIZE / tilePx; tx++) {
      ctx.fillStyle = shade(base, (rng() - 0.5) * 0.06);
      ctx.fillRect(tx * tilePx + grout, ty * tilePx + grout, tilePx - grout * 2, tilePx - grout * 2);
    }
  }
}

function drawSpeckle(ctx: CanvasRenderingContext2D, base: string, amount: number, count: number) {
  const rng = makeRng(13);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = shade(base, (rng() - 0.5) * amount);
    const r = 0.6 + rng() * 1.6;
    ctx.fillRect(rng() * SIZE, rng() * SIZE, r, r);
  }
}

/** Woven-pile rug texture: a dense fibre field over a subtle warp/weft weave, so the surface
 * reads as fabric rather than flat paint. Not tiled — one texture spans the whole rug. */
export function makeRugTexture(baseHex: string): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(31);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Weave: alternating light/dark threads in both directions.
  const thread = 4;
  for (let y = 0; y < SIZE; y += thread) {
    ctx.fillStyle = `rgba(0,0,0,${(y / thread) % 2 === 0 ? 0.05 : 0.02})`;
    ctx.fillRect(0, y, SIZE, thread);
  }
  for (let x = 0; x < SIZE; x += thread) {
    ctx.fillStyle = `rgba(255,255,255,${(x / thread) % 2 === 0 ? 0.04 : 0.015})`;
    ctx.fillRect(x, 0, thread, SIZE);
  }

  // Pile: short fibre strokes at random angles catch light differently across the surface.
  for (let i = 0; i < 24000; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const a = rng() * Math.PI * 2;
    const len = 1.5 + rng() * 3;
    const light = rng() > 0.5;
    ctx.strokeStyle = light ? `rgba(255,255,255,${0.03 + rng() * 0.07})` : `rgba(0,0,0,${0.03 + rng() * 0.08})`;
    ctx.lineWidth = 0.8 + rng() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // Border band, the way most woven rugs are finished.
  const inset = SIZE * 0.045;
  ctx.strokeStyle = shade(baseHex, -0.14);
  ctx.lineWidth = SIZE * 0.018;
  ctx.strokeRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2);
  ctx.strokeStyle = shade(baseHex, 0.1);
  ctx.lineWidth = SIZE * 0.006;
  ctx.strokeRect(inset * 1.7, inset * 1.7, SIZE - inset * 3.4, SIZE - inset * 3.4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Builds a tileable floor texture matching a style profile. One tile = 4ft x 4ft. */
export function makeFloorTexture(style: StyleProfile): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  const base = style.floor.colorHex;
  const accent = style.floor.accentHex ?? shade(base, -0.08);
  switch (style.floor.material) {
    case 'wood':
      drawWood(ctx, base, accent);
      break;
    case 'tile':
      drawTile(ctx, base, accent);
      break;
    case 'carpet':
      drawSpeckle(ctx, base, 0.12, 26000);
      break;
    case 'concrete':
      drawSpeckle(ctx, base, 0.05, 9000);
      break;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
