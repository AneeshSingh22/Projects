/**
 * Verifies that fixtures meant to sit against a wall actually touch a REAL wall.
 *
 * This catches the failure the other checkers missed: a fixture can be inside its room, clear of
 * every doorway, and still look marooned because the "wall" it backs onto was dissolved by a wide
 * open-plan opening. Islands are exempt — standing free is the point of an island.
 */
import fs from 'fs';
import { dedupeWalls } from '../src/lib/floorPlan.ts';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const walls = dedupeWalls(d.spaces, undefined, d.doors);

const FREESTANDING = /island|desk|table/i;
const MAX_GAP_IN = 8; // wall thickness plus a little tolerance

let bad = 0;
for (const f of d.fixtures) {
  if (FREESTANDING.test(f.type)) { console.log(`  free ${f.type.padEnd(16)} (freestanding, exempt)`); continue; }

  const sideways = f.facing === 'left' || f.facing === 'right';
  const w = sideways ? f.depthIn : f.widthIn;
  const dp = sideways ? f.widthIn : f.depthIn;
  const x0 = f.center.x - w / 2, x1 = f.center.x + w / 2;
  const z0 = f.center.z - dp / 2, z1 = f.center.z + dp / 2;

  // Distance from the fixture's box to the nearest wall segment.
  let best = Infinity;
  for (const wall of walls) {
    const vertical = Math.abs(wall.a.x - wall.b.x) < 1;
    if (vertical) {
      const zlo = Math.min(wall.a.z, wall.b.z), zhi = Math.max(wall.a.z, wall.b.z);
      if (z1 < zlo || z0 > zhi) continue;                    // no overlap along the wall
      best = Math.min(best, Math.abs(wall.a.x - x0), Math.abs(wall.a.x - x1));
    } else {
      const xlo = Math.min(wall.a.x, wall.b.x), xhi = Math.max(wall.a.x, wall.b.x);
      if (x1 < xlo || x0 > xhi) continue;
      best = Math.min(best, Math.abs(wall.a.z - z0), Math.abs(wall.a.z - z1));
    }
  }

  if (best > MAX_GAP_IN) {
    bad++;
    console.log(`  BAD  ${f.type.padEnd(16)} is ${best.toFixed(0)}in from the nearest wall — it will look marooned`);
  } else {
    console.log(`  ok   ${f.type.padEnd(16)} ${best.toFixed(0)}in from its wall`);
  }
}

console.log(bad ? `\n${bad} FIXTURE(S) NOT AGAINST A WALL` : '\nAll wall fixtures are against a real wall.');
process.exitCode = bad ? 1 : 0;
