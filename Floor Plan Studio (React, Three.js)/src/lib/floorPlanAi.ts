import type { PixelPoint } from './floorPlanVision';
import { authHeaders } from './apiKey';

export interface AiRoomResult {
  name: string;
  polygonPx: PixelPoint[];
  bboxPx: { minX: number; minY: number; maxX: number; maxY: number };
  widthIn: number;
  depthIn: number;
}

export interface AiDoorResult {
  /** center of the opening, in original-image pixels */
  centerPx: PixelPoint;
  widthIn: number;
  connects: string[];
}

export interface AiWindowResult {
  /** center of the window, in original-image pixels */
  centerPx: PixelPoint;
  widthIn: number;
}

export type AiFixtureFacing = 'up' | 'down' | 'left' | 'right';

export interface AiFixtureResult {
  type: string;
  /** center of the fixture, in original-image pixels */
  centerPx: PixelPoint;
  /** image-axis extents in real inches (already at plan scale — no pixel conversion needed) */
  widthIn: number;
  depthIn: number;
  facing: AiFixtureFacing;
}

export interface AiFloorPlanResult {
  rooms: AiRoomResult[];
  doors: AiDoorResult[];
  windows: AiWindowResult[];
  fixtures: AiFixtureResult[];
}

interface AiRoomResponse {
  rooms: { name: string; polygon: { x: number; y: number }[]; widthIn: number; depthIn: number }[];
  doors?: { x: number; y: number; widthIn: number; connects: string[] }[];
  windows?: { x: number; y: number; widthIn: number; room: string }[];
  fixtures?: { type: string; x: number; y: number; widthIn: number; depthIn: number; facing: AiFixtureFacing; room: string }[];
}

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve({ data: result.slice(comma + 1), mediaType: file.type || 'image/png' });
    };
    reader.readAsDataURL(file);
  });
}

function bboxOf(points: PixelPoint[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Sends the floor plan image to the local backend, which calls Claude's vision model to read
 * room shapes, printed dimensions, and names semantically (rather than the pixel-level flood-fill
 * approach in floorPlanVision.ts, which cannot reliably read open-concept layouts or connect
 * rooms). Requires `npm run server` (or `npm run dev:all`) running with an ANTHROPIC_API_KEY. */
export async function analyzeFloorPlanWithAi(file: File, image: HTMLImageElement): Promise<AiFloorPlanResult> {
  const { data, mediaType } = await fileToBase64(file);

  let res: Response;
  try {
    res = await fetch('/api/analyze-floor-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ imageBase64: data, mediaType }),
    });
  } catch {
    throw new Error(
      'Could not reach the local AI server. Make sure it is running: npm run server (or npm run dev:all).',
    );
  }

  if (!res.ok) {
    // A 502/504 here is the Vite dev proxy failing to reach the backend (its body is HTML, not
    // JSON), which almost always means the AI server just isn't running — report that plainly
    // instead of a bare status code the user can't act on.
    let message =
      res.status === 502 || res.status === 504
        ? 'The local AI server is not running. Stop the dev server and start both with: npm run dev:all'
        : `AI analysis failed (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON body (proxy error page) — keep the message chosen above.
    }
    throw new Error(message);
  }

  const body: AiRoomResponse = await res.json();
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  const rooms = body.rooms
    .filter((r) => r.polygon.length >= 3)
    .map((r) => {
      const polygonPx = r.polygon.map((p) => ({ x: p.x * w, y: p.y * h }));
      return {
        name: r.name?.trim() || 'Room',
        polygonPx,
        bboxPx: bboxOf(polygonPx),
        widthIn: r.widthIn > 0 ? r.widthIn : 0,
        depthIn: r.depthIn > 0 ? r.depthIn : 0,
      };
    });

  const doors = (body.doors ?? [])
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
    .map((d) => ({
      centerPx: { x: d.x * w, y: d.y * h },
      // Clamp to a sane physical range so one bad number can't carve a whole wall away.
      widthIn: Math.min(Math.max(d.widthIn > 0 ? d.widthIn : 32, 24), 144),
      connects: d.connects ?? [],
    }));

  const windows = (body.windows ?? [])
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
    .map((d) => ({
      centerPx: { x: d.x * w, y: d.y * h },
      widthIn: Math.min(Math.max(d.widthIn > 0 ? d.widthIn : 36, 18), 240),
    }));

  const fixtures = (body.fixtures ?? [])
    .filter((f) => Number.isFinite(f.x) && Number.isFinite(f.y) && f.widthIn > 0 && f.depthIn > 0)
    .map((f) => ({
      type: f.type,
      centerPx: { x: f.x * w, y: f.y * h },
      widthIn: Math.min(Math.max(f.widthIn, 10), 240),
      depthIn: Math.min(Math.max(f.depthIn, 10), 240),
      facing: (['up', 'down', 'left', 'right'] as const).includes(f.facing) ? f.facing : 'down',
    }));

  return { rooms, doors, windows, fixtures };
}

export interface ImportedProduct {
  name: string;
  category: string;
  shape: string;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  colorHex: string;
  wallMounted: boolean;
  dimensionsFound: boolean;
  imageDataUrl?: string | null;
  sourceUrl: string;
}

/** Asks the backend to fetch a product page and have Claude read its name, real dimensions,
 * colour and closest matching 3D shape. */
export async function importProductFromUrl(url: string): Promise<ImportedProduct> {
  let res: Response;
  try {
    res = await fetch('/api/product-from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error('Could not reach the local AI server. Start it with: npm run dev:all');
  }
  if (!res.ok) {
    let message =
      res.status === 502 || res.status === 504
        ? 'The local AI server is not running. Start both servers with: npm run dev:all'
        : `Import failed (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
}

/** Sends the user's room photos to the backend, which asks Claude's vision model for the
 * apartment's real finishes (floor material/color, wall paint, trim, window style). */
export async function extractStyleFromPhotos(files: (File | Blob)[]): Promise<import('../types').StyleProfile> {
  const images = await Promise.all(
    files.slice(0, 6).map(async (f) => {
      const buf = await f.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return { data: btoa(binary), mediaType: f.type || 'image/jpeg' };
    }),
  );

  const res = await fetch('/api/extract-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    let message =
      res.status === 502 || res.status === 504
        ? 'The local AI server is not running. Start both servers with: npm run dev:all'
        : `Style extraction failed (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return res.json();
}
