import fs from 'node:fs';
function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const all = d.rooms.flatMap(r => r.polygon);
  const minX = Math.min(...all.map(p=>p.x)), maxX = Math.max(...all.map(p=>p.x));
  const minY = Math.min(...all.map(p=>p.y)), maxY = Math.max(...all.map(p=>p.y));
  const N = 120; let tot = 0, cov = 0;
  for (let i=0;i<N;i++) for (let j=0;j<N;j++) {
    const pt = { x: minX + ((i+0.5)/N)*(maxX-minX), y: minY + ((j+0.5)/N)*(maxY-minY) };
    tot++; if (d.rooms.some(r => inPoly(pt, r.polygon))) cov++;
  }
  const hall = d.rooms.filter(r => /hall|corridor|foyer|entry/i.test(r.name)).map(r=>r.name);
  console.log(`${f}: rooms=${d.rooms.length} coverage=${(100*cov/tot).toFixed(1)}% circulation=[${hall.join(', ')||'NONE'}]`);
}
