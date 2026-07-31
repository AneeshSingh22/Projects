/** Verifies every fixture sits fully inside a room and clear of every doorway. */
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

let bad = 0;
for (const f of d.fixtures) {
  const sideways = f.facing === 'left' || f.facing === 'right';
  const w = sideways ? f.depthIn : f.widthIn;
  const dp = sideways ? f.widthIn : f.depthIn;
  const corners = [
    [f.center.x - w / 2, f.center.z - dp / 2], [f.center.x + w / 2, f.center.z - dp / 2],
    [f.center.x + w / 2, f.center.z + dp / 2], [f.center.x - w / 2, f.center.z + dp / 2],
  ];
  const room = d.spaces.find((s) => inPoly(s.polygon, f.center.x, f.center.z));
  const outside = corners.filter(([x, z]) => !room || !inPoly(room.polygon, x, z));
  // Doorway clearance: does the fixture's footprint overlap the walk-through corridor of a door?
  // The corridor is the door's width along the wall, extended 24in either side of the wall line.
  const x0 = f.center.x - w / 2, x1 = f.center.x + w / 2;
  const z0 = f.center.z - dp / 2, z1 = f.center.z + dp / 2;
  // Openings >= 72in dissolve their wall entirely (open plan), so nothing "blocks" them — the
  // rooms merge. Only real doorways need walk-through clearance.
  const blocked = d.doors.filter((dr) => dr.widthIn < 72).filter((dr) => {
    // Infer wall axis: the door lies on a room boundary, so one coord is on a shared wall line.
    const onVertical = d.spaces.some((s) => s.polygon.some((p) => Math.abs(p.x - dr.center.x) < 1));
    const dx0 = onVertical ? dr.center.x - 24 : dr.center.x - dr.widthIn / 2;
    const dx1 = onVertical ? dr.center.x + 24 : dr.center.x + dr.widthIn / 2;
    const dz0 = onVertical ? dr.center.z - dr.widthIn / 2 : dr.center.z - 24;
    const dz1 = onVertical ? dr.center.z + dr.widthIn / 2 : dr.center.z + 24;
    return x0 < dx1 && x1 > dx0 && z0 < dz1 && z1 > dz0;
  });
  const problems = [];
  if (!room) problems.push('NOT IN ANY ROOM');
  else if (outside.length) problems.push(`${outside.length}/4 corners outside ${room.name}`);
  if (blocked.length)
    problems.push(
      `blocks doorway(s) at ${blocked.map((b) => `(${b.center.x},${b.center.z})w${b.widthIn}`).join(' ')}`,
    );
  if (problems.length) { bad++; console.log(`  BAD  ${f.type.padEnd(16)} @(${f.center.x},${f.center.z}) — ${problems.join('; ')}`); }
  else console.log(`  ok   ${f.type.padEnd(16)} in ${room.name}`);
}
console.log(bad ? `\n${bad} FIXTURE PROBLEM(S)` : '\nAll fixtures placed cleanly.');
process.exitCode = bad ? 1 : 0;
