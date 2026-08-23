/**
 * Checks that rooms have believable proportions and sizes.
 *
 * A gap-free tiling can still look fake: it is easy to satisfy "no voids" with 21ft-long corridors
 * and rooms nobody would ever build. Real rooms are roughly squarish and fall in known size ranges,
 * so this asserts both.
 */
import fs from 'fs';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// maxAspect = long side / short side. Corridors are allowed to be long; habitable rooms are not.
const RULES = [
  { match: /hall|corridor/i,        maxAspect: 5.0, minSqft: 30,  maxSqft: 140, label: 'hallway' },
  // Laundry/pantry are reach-in scale; a bedroom's walk-in closet is legitimately larger.
  { match: /laundry|pantry/i, maxAspect: 3.0, minSqft: 12, maxSqft: 60,  label: 'utility closet' },
  { match: /closet/i,         maxAspect: 3.0, minSqft: 12, maxSqft: 100, label: 'closet' },
  { match: /bath/i,                 maxAspect: 2.4, minSqft: 35,  maxSqft: 120, label: 'bathroom' },
  { match: /bedroom/i,              maxAspect: 1.6, minSqft: 110, maxSqft: 260, label: 'bedroom' },
  { match: /kitchen/i,              maxAspect: 2.2, minSqft: 80,  maxSqft: 220, label: 'kitchen' },
  { match: /living|dining/i,        maxAspect: 1.8, minSqft: 180, maxSqft: 420, label: 'living space' },
];

let bad = 0;
for (const s of d.spaces) {
  const xs = s.polygon.map((p) => p.x), zs = s.polygon.map((p) => p.z);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...zs) - Math.min(...zs);
  const aspect = Math.max(w, h) / Math.min(w, h);
  const sqft = (w * h) / 144;
  const rule = RULES.find((r) => r.match.test(s.name));

  const problems = [];
  if (rule) {
    if (aspect > rule.maxAspect) problems.push(`aspect ${aspect.toFixed(1)}:1 (max ${rule.maxAspect} for a ${rule.label})`);
    if (sqft < rule.minSqft) problems.push(`${sqft.toFixed(0)}sqft is small for a ${rule.label} (min ${rule.minSqft})`);
    if (sqft > rule.maxSqft) problems.push(`${sqft.toFixed(0)}sqft is large for a ${rule.label} (max ${rule.maxSqft})`);
  } else if (aspect > 2.5) {
    problems.push(`aspect ${aspect.toFixed(1)}:1 on an unclassified room`);
  }

  const dims = `${(w / 12).toFixed(1)}' x ${(h / 12).toFixed(1)}'`;
  if (problems.length) { bad++; console.log(`  BAD  ${s.name.padEnd(13)} ${dims.padEnd(14)} — ${problems.join('; ')}`); }
  else console.log(`  ok   ${s.name.padEnd(13)} ${dims.padEnd(14)} ${sqft.toFixed(0)}sqft  ${aspect.toFixed(1)}:1`);
}

console.log(bad ? `\n${bad} ROOM(S) WITH UNREALISTIC PROPORTIONS` : '\nAll rooms have believable proportions.');
process.exitCode = bad ? 1 : 0;
