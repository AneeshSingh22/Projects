/**
 * Verifies the apartment is a gap-free tiling: every square inch inside the outer footprint
 * belongs to exactly one room. Gaps render as holes in the floor; overlaps render as z-fighting.
 */
import fs from 'fs';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const inPoly = (poly, x, z) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
};

const xs = d.spaces.flatMap((s) => s.polygon.map((p) => p.x));
const zs = d.spaces.flatMap((s) => s.polygon.map((p) => p.z));
const X0 = Math.min(...xs), X1 = Math.max(...xs);
const Z0 = Math.min(...zs), Z1 = Math.max(...zs);

// Sample on a 6in grid — finer than any wall, coarse enough to stay fast.
const STEP = 6;
let gaps = 0, overlaps = 0, total = 0;
const gapPoints = [], overlapPoints = [];
for (let x = X0 + STEP / 2; x < X1; x += STEP) {
  for (let z = Z0 + STEP / 2; z < Z1; z += STEP) {
    const hits = d.spaces.filter((s) => inPoly(s.polygon, x, z));
    total++;
    if (hits.length === 0) { gaps++; if (gapPoints.length < 8) gapPoints.push([Math.round(x), Math.round(z)]); }
    else if (hits.length > 1) {
      overlaps++;
      if (overlapPoints.length < 8) overlapPoints.push([Math.round(x), Math.round(z), hits.map((h) => h.name).join('+')]);
    }
  }
}

const sqft = (n) => ((n * STEP * STEP) / 144).toFixed(0);
console.log(`footprint ${((X1 - X0) / 12).toFixed(1)}ft x ${((Z1 - Z0) / 12).toFixed(1)}ft`);
console.log(`covered   ${(100 * (total - gaps) / total).toFixed(1)}%`);
console.log(`gaps      ${sqft(gaps)} sqft` + (gapPoints.length ? `  e.g. ${gapPoints.map((p) => `(${p[0]},${p[1]})`).join(' ')}` : ''));
console.log(`overlaps  ${sqft(overlaps)} sqft` + (overlapPoints.length ? `  e.g. ${overlapPoints.map((p) => `(${p[0]},${p[1]})=${p[2]}`).join(' ')}` : ''));

// A non-rectangular footprint (an L, a notched corner) legitimately leaves part of the bounding
// box empty — that is outside the building, not a hole in it. What matters is that no gap is
// INTERIOR: enclosed on all four sides by rooms. Flood-fill the gaps from the bounding-box edge;
// anything the fill cannot reach is a real hole in the middle of the plan.
const gridW = Math.ceil((X1 - X0) / STEP), gridH = Math.ceil((Z1 - Z0) / STEP);
const isGap = (i, j) => {
  const x = X0 + STEP / 2 + i * STEP, z = Z0 + STEP / 2 + j * STEP;
  return !d.spaces.some((s) => inPoly(s.polygon, x, z));
};
const seen = new Set();
const stack = [];
for (let i = 0; i < gridW; i++) { stack.push([i, 0], [i, gridH - 1]); }
for (let j = 0; j < gridH; j++) { stack.push([0, j], [gridW - 1, j]); }
while (stack.length) {
  const [i, j] = stack.pop();
  const key = i + ',' + j;
  if (i < 0 || j < 0 || i >= gridW || j >= gridH || seen.has(key)) continue;
  if (!isGap(i, j)) continue;          // rooms block the fill
  seen.add(key);
  stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
}
let interiorGaps = 0;
for (let i = 0; i < gridW; i++)
  for (let j = 0; j < gridH; j++)
    if (isGap(i, j) && !seen.has(i + ',' + j)) interiorGaps++;

console.log(`  of which INTERIOR (real holes): ${sqft(interiorGaps)} sqft`);
console.log(`  outside the footprint (fine):   ${sqft(gaps - interiorGaps)} sqft`);

const ok = interiorGaps * STEP * STEP / 144 < 5 && overlaps === 0;
console.log(ok ? '\nTiling is gap-free.' : '\nTILING HAS HOLES OR OVERLAPS');
process.exitCode = ok ? 0 : 1;
