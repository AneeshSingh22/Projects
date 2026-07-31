import fs from 'fs';

const path = process.argv[2] ?? 'c:/Users/Singh/OneDrive/Documents/ApartmentAIAPP/src/data/exampleApartment.json';
const d = JSON.parse(fs.readFileSync(path, 'utf8'));

const bbox = (s) => {
  const xs = s.polygon.map((p) => p.x), zs = s.polygon.map((p) => p.z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
};

// Two spaces are adjacent if their bounding boxes touch along a shared edge with real overlap.
const TOUCH = 12; // in — walls are ~5in, allow for gaps between traced polygons
function sharedEdge(a, b) {
  const A = bbox(a), B = bbox(b);
  // vertical wall between them (A right ~ B left, or vice versa)
  const zOv = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0);
  const xOv = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
  if (zOv > 18) {
    if (Math.abs(A.x1 - B.x0) <= TOUCH) return { axis: 'x', at: (A.x1 + B.x0) / 2, lo: Math.max(A.z0, B.z0), hi: Math.min(A.z1, B.z1) };
    if (Math.abs(B.x1 - A.x0) <= TOUCH) return { axis: 'x', at: (B.x1 + A.x0) / 2, lo: Math.max(A.z0, B.z0), hi: Math.min(A.z1, B.z1) };
  }
  if (xOv > 18) {
    if (Math.abs(A.z1 - B.z0) <= TOUCH) return { axis: 'z', at: (A.z1 + B.z0) / 2, lo: Math.max(A.x0, B.x0), hi: Math.min(A.x1, B.x1) };
    if (Math.abs(B.z1 - A.z0) <= TOUCH) return { axis: 'z', at: (B.z1 + A.z0) / 2, lo: Math.max(A.x0, B.x0), hi: Math.min(A.x1, B.x1) };
  }
  return null;
}

// A door serves an edge if it sits on that shared boundary.
function doorOnEdge(door, edge) {
  const c = door.center;
  if (edge.axis === 'x') {
    return Math.abs(c.x - edge.at) <= 20 && c.z >= edge.lo - 8 && c.z <= edge.hi + 8;
  }
  return Math.abs(c.z - edge.at) <= 20 && c.x >= edge.lo - 8 && c.x <= edge.hi + 8;
}

const spaces = d.spaces;
const edges = [];
for (let i = 0; i < spaces.length; i++) {
  for (let j = i + 1; j < spaces.length; j++) {
    const e = sharedEdge(spaces[i], spaces[j]);
    if (e) {
      const doors = (d.doors ?? []).filter((dr) => doorOnEdge(dr, e));
      edges.push({ a: spaces[i], b: spaces[j], e, doors });
    }
  }
}

console.log('=== adjacent room pairs ===');
for (const { a, b, e, doors } of edges) {
  const span = (e.hi - e.lo).toFixed(0);
  console.log(
    `${doors.length ? 'OPEN  ' : 'SEALED'} ${a.name.padEnd(12)} <-> ${b.name.padEnd(12)} shared ${span}in  ${doors.length ? `(${doors.length} door)` : ''}`,
  );
}

// Flood fill from the Hall through open edges only.
const adj = new Map(spaces.map((s) => [s.id, []]));
for (const { a, b, doors } of edges) {
  if (doors.length) { adj.get(a.id).push(b.id); adj.get(b.id).push(a.id); }
}
const start = spaces.find((s) => s.name === 'Hall') ?? spaces[0];
const seen = new Set([start.id]);
const queue = [start.id];
while (queue.length) {
  for (const n of adj.get(queue.shift())) if (!seen.has(n)) { seen.add(n); queue.push(n); }
}

const unreachable = spaces.filter((s) => !seen.has(s.id));
console.log(`\n=== reachable from ${start.name}: ${seen.size}/${spaces.length} ===`);
if (unreachable.length) {
  console.log('UNREACHABLE:');
  for (const s of unreachable) console.log('  -', s.name);
} else {
  console.log('All spaces reachable.');
}
