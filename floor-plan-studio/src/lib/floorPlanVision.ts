export interface PixelPoint {
  x: number;
  y: number;
}

export interface DetectedRoom {
  polygonPx: PixelPoint[];
  bboxPx: { minX: number; minY: number; maxX: number; maxY: number };
  areaPx: number;
}

function binarize(imageData: ImageData, threshold: number): Uint8Array {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    mask[i] = lum < threshold ? 1 : 0;
  }
  return mask;
}

/** Grows the dark/wall mask outward by `radius` pixels (8-neighbor box dilation, `radius`
 * iterations of 1px growth) so small gaps — most importantly door openings, which are real,
 * intentional breaks in the wall line on an architectural plan — get bridged before flood-fill,
 * instead of leaking every room into one connected blob through its doorway. */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  let current = mask;
  for (let iter = 0; iter < radius; iter++) {
    const next = new Uint8Array(current.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (current[idx] === 1) {
          next[idx] = 1;
          continue;
        }
        let dark = false;
        for (let dy = -1; dy <= 1 && !dark; dy++) {
          for (let dx = -1; dx <= 1 && !dark; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && current[ny * width + nx] === 1) dark = true;
          }
        }
        next[idx] = dark ? 1 : 0;
      }
    }
    current = next;
  }
  return current;
}

/** Iterative (stack-based) 4-connected flood fill / connected-component labeling. */
function labelComponents(mask: Uint8Array, width: number, height: number, targetValue: number) {
  const labels = new Int32Array(width * height).fill(-1);
  const areas: number[] = [];
  const stack: number[] = [];
  let count = 0;

  for (let start = 0; start < width * height; start++) {
    if (mask[start] !== targetValue || labels[start] !== -1) continue;
    const label = count++;
    let area = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      area++;
      const x = idx % width;
      const y = (idx / width) | 0;
      if (x > 0 && mask[idx - 1] === targetValue && labels[idx - 1] === -1) {
        labels[idx - 1] = label;
        stack.push(idx - 1);
      }
      if (x < width - 1 && mask[idx + 1] === targetValue && labels[idx + 1] === -1) {
        labels[idx + 1] = label;
        stack.push(idx + 1);
      }
      if (y > 0 && mask[idx - width] === targetValue && labels[idx - width] === -1) {
        labels[idx - width] = label;
        stack.push(idx - width);
      }
      if (y < height - 1 && mask[idx + width] === targetValue && labels[idx + width] === -1) {
        labels[idx + width] = label;
        stack.push(idx + width);
      }
    }
    areas.push(area);
  }
  return { labels, count, areas };
}

/** Moore-neighbor boundary tracing around a filled connected-component region. */
function traceContour(labels: Int32Array, width: number, height: number, label: number): PixelPoint[] {
  let startIdx = -1;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === label) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return [];

  const startX = startIdx % width;
  const startY = (startIdx / width) | 0;
  const isForeground = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height && labels[y * width + x] === label;

  // Clockwise 8-neighbor offsets starting West.
  const dirs: [number, number][] = [
    [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
  ];

  const boundary: PixelPoint[] = [{ x: startX, y: startY }];
  let cx = startX;
  let cy = startY;
  let currentDir = 0;
  const maxSteps = width * height * 4;
  let steps = 0;

  do {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const dIdx = (currentDir + k) % 8;
      const [dx, dy] = dirs[dIdx];
      const nx = cx + dx;
      const ny = cy + dy;
      if (isForeground(nx, ny)) {
        cx = nx;
        cy = ny;
        boundary.push({ x: cx, y: cy });
        currentDir = (dIdx + 6) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    steps++;
  } while ((cx !== startX || cy !== startY) && steps < maxSteps);

  return boundary;
}

function perpendicularDistance(p: PixelPoint, a: PixelPoint, b: PixelPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function douglasPeucker(points: PixelPoint[], epsilon: number): PixelPoint[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

/** RDP simplification for a closed contour: split at the two most-distant points, simplify each half, merge. */
function simplifyClosedPolygon(points: PixelPoint[], epsilon: number): PixelPoint[] {
  if (points.length < 4) return points;
  let farIdx = 0;
  let farDist = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
    if (d > farDist) {
      farDist = d;
      farIdx = i;
    }
  }
  const half1 = points.slice(0, farIdx + 1);
  const half2 = [...points.slice(farIdx), points[0]];
  const s1 = douglasPeucker(half1, epsilon);
  const s2 = douglasPeucker(half2, epsilon);
  return [...s1.slice(0, -1), ...s2.slice(0, -1)];
}

/** Nudges near-0/90/180/270° edges to exactly axis-aligned, since real walls almost always are. */
function snapToAxisAligned(points: PixelPoint[], toleranceDeg: number): PixelPoint[] {
  const result = points.map((p) => ({ ...p }));
  const n = result.length;
  for (let i = 1; i <= n; i++) {
    const a = result[i - 1];
    const bIdx = i % n;
    const b = result[bIdx];
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const normalized = ((angle % 180) + 180) % 180;
    if (Math.min(normalized, 180 - normalized) <= toleranceDeg) {
      result[bIdx] = { x: b.x, y: a.y };
    } else if (Math.abs(normalized - 90) <= toleranceDeg) {
      result[bIdx] = { x: a.x, y: b.y };
    }
  }
  return result;
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

/** Detects candidate room polygons from a floor plan image: binarize -> flood-fill the light
 * (non-wall) regions -> trace each region's boundary -> simplify to corners -> snap to axes.
 * Returned polygons are in the ORIGINAL image's natural pixel space regardless of the internal
 * processing resolution. */
export function detectRoomPolygons(
  image: HTMLImageElement,
  opts?: { processMaxDim?: number; minAreaFraction?: number; darkThreshold?: number; gapCloseRadius?: number },
): DetectedRoom[] {
  const processMaxDim = opts?.processMaxDim ?? 1200;
  const scale = Math.min(processMaxDim / image.naturalWidth, processMaxDim / image.naturalHeight, 1);
  const pw = Math.max(1, Math.round(image.naturalWidth * scale));
  const ph = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, pw, ph);
  const imageData = ctx.getImageData(0, 0, pw, ph);

  const rawMask = binarize(imageData, opts?.darkThreshold ?? 140);
  // Default radius scales with resolution so it closes door-sized gaps (~2-3% of the plan's
  // longer side) consistently regardless of the source image's size.
  const gapCloseRadius = opts?.gapCloseRadius ?? Math.round(Math.max(pw, ph) * 0.012);
  const mask = dilate(rawMask, pw, ph, gapCloseRadius);
  const { labels, count, areas } = labelComponents(mask, pw, ph, 0);

  // The component touching the image's top-left corner is background (outside the plan), not a room.
  const backgroundLabel = labels[0];
  const minArea = (opts?.minAreaFraction ?? 0.004) * pw * ph;
  const invScale = 1 / scale;

  const rooms: DetectedRoom[] = [];
  for (let label = 0; label < count; label++) {
    if (label === backgroundLabel) continue;
    if (areas[label] < minArea) continue;
    const contourPx = traceContour(labels, pw, ph, label);
    if (contourPx.length < 8) continue;
    const simplified = simplifyClosedPolygon(contourPx, Math.max(2, pw * 0.004));
    const snapped = snapToAxisAligned(simplified, 6);
    const polygonPx = snapped.map((p) => ({ x: p.x * invScale, y: p.y * invScale }));
    const bboxPx = bboxOf(polygonPx);
    // A real interior room never touches the raw image's outer edge — a component that does is
    // almost always a stray sliver outside the drawn plan (e.g. beside a window symbol), not a room.
    const touchesEdge = bboxPx.minX <= invScale || bboxPx.minY <= invScale || bboxPx.maxX >= image.naturalWidth - invScale || bboxPx.maxY >= image.naturalHeight - invScale;
    if (touchesEdge) continue;
    rooms.push({ polygonPx, bboxPx, areaPx: areas[label] * invScale * invScale });
  }
  return rooms;
}
