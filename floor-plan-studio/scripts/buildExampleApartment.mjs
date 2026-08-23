/**
 * Authors the example apartment: a purpose-built, ideal 2-bed / 2-bath.
 *
 * This is deliberately NOT a trace of any real plan. It is the app's shop window — the first thing
 * every visitor sees — so it is designed to be flawless rather than faithful: a plain rectangular
 * footprint tiled edge to edge, so there is no void anywhere, and every door placed on a wall two
 * rooms actually share.
 *
 * Design rules enforced by scripts/checkCoverage.mjs, checkConnectivity.mjs and checkFixtures.mjs:
 *   - The rooms tile the whole 34' x 40' rectangle. No gaps, no overlaps.
 *   - Every room is reachable from the entry through real doorways.
 *   - Every fixture sits fully inside its room and clear of every doorway.
 *   - Every room is wide enough to walk into and turn around in.
 *
 * Layout — a central hallway spine, private rooms on the left, living space on the right:
 *
 *        x=0        156           240      408
 *   z=0   +----------------------------------+
 *         |  Bedroom 1        |              |
 *         |  13' x 12'        |   Living     |
 *   144   +---------+---------+   17' x 21'  |
 *         | Bath 1  | Hallway |              |
 *   252   +---------+         +--------------+
 *         | W/D     |         |              |
 *   312   +---------+---------+   Kitchen    |
 *         | Bath 2  |         |   14' x 11'  |
 *   396   +---------+---------+--------------+
 *         |  Bedroom 2  13' x 12'            |
 *   480   +----------------------------------+
 */

import fs from 'fs';

// ---- Vertical wall lines (x, inches) --------------------------------------------------------
const X0 = 0;    // left exterior
const X_A = 156; // right edge of the left-hand rooms / left edge of the hallway
const X_B = 240; // right edge of the hallway / left edge of the living space
const X1 = 408;  // right exterior  (34 ft)

// ---- Horizontal wall lines (z, inches) ------------------------------------------------------
const Z0 = 0;     // top exterior
const Z_A = 144;  // bottom of Bedroom 1
const Z_B = 252;  // bottom of Bath 1
const Z_C = 312;  // bottom of the W/D closet
const Z_D = 396;  // bottom of Bath 2 / top of Bedroom 2
const Z_LIV = 252; // living / kitchen divider on the right side
const Z1 = 480;   // bottom exterior (40 ft)

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

const spaces = [
  // --- right side: open-plan living + kitchen, the showpiece of the apartment ---
  { id: 'space-0', name: 'Living Room', polygon: rect(X_B, Z0,    X1, Z_LIV) },
  { id: 'space-1', name: 'Kitchen',     polygon: rect(X_B, Z_LIV, X1, Z_D)   },

  // --- top-left: primary bedroom, spanning the width above the hallway ---
  { id: 'space-2', name: 'Bedroom 1', polygon: rect(X0, Z0, X_B, Z_A) },

  // --- left column: the two baths with the laundry closet between them ---
  { id: 'space-3', name: 'Bathroom 1',   polygon: rect(X0, Z_A, X_A, Z_B) },
  { id: 'space-4', name: 'Laundry',      polygon: rect(X0, Z_B, X_A, Z_C) },
  { id: 'space-5', name: 'Bathroom 2',   polygon: rect(X0, Z_C, X_A, Z_D) },

  // --- hallway spine: connects everything, from the entry down to Bedroom 2 ---
  { id: 'space-6', name: 'Hallway', polygon: rect(X_A, Z_A, X_B, Z_D) },

  // --- bottom: second bedroom, spanning the full width ---
  { id: 'space-7', name: 'Bedroom 2', polygon: rect(X0, Z_D, X1, Z1) },
];

/**
 * Doors. Each is centred on a wall the two rooms genuinely share, and offset from room corners so
 * it never lands where two walls meet. Openings >= 72in dissolve their wall entirely, which is how
 * the living room and kitchen read as one open-plan space.
 */
const doors = [
  // Open plan: living room flows into the kitchen across their full shared wall.
  { center: { x: 324, z: Z_LIV }, widthIn: 120 },

  // Hallway is the hub: living room, kitchen, both baths, laundry and both bedrooms open off it.
  { center: { x: X_B, z: 180 },  widthIn: 60 },  // Hallway <-> Living Room (cased opening)
  { center: { x: X_B, z: 340 },  widthIn: 40 },  // Hallway <-> Kitchen
  { center: { x: X_A, z: 186 },  widthIn: 32 },  // Hallway <-> Bathroom 1
  { center: { x: X_A, z: 282 },  widthIn: 48 },  // Hallway <-> Laundry (bifold)
  { center: { x: X_A, z: 354 },  widthIn: 32 },  // Hallway <-> Bathroom 2
  { center: { x: 198, z: Z_A },  widthIn: 34 },  // Hallway <-> Bedroom 1
  { center: { x: 198, z: Z_D },  widthIn: 34 },  // Hallway <-> Bedroom 2
];

// Windows on exterior walls only, spread so every habitable room gets daylight.
const windows = [
  { center: { x: 300, z: Z0 }, widthIn: 72 },  // Living Room, front
  { center: { x: X1,  z: 96 }, widthIn: 60 },  // Living Room, side
  { center: { x: X1,  z: 330 }, widthIn: 48 }, // Kitchen, side
  { center: { x: 78,  z: Z0 }, widthIn: 60 },  // Bedroom 1, front
  { center: { x: 96,  z: Z1 }, widthIn: 60 },  // Bedroom 2, rear
  { center: { x: 300, z: Z1 }, widthIn: 60 },  // Bedroom 2, rear
];

/**
 * Built-ins. `center` is the centre point, so anything against a wall sits half its depth plus ~3in
 * of wall thickness off that wall line. Sideways-facing items swap width/depth, so their clearance
 * uses widthIn.
 */
const fixtures = [
  // Kitchen: an L of counters along the bottom and right walls, plus an island.
  { type: 'fridge',          center: { x: 264, z: Z_D - 18 }, widthIn: 36, depthIn: 30, facing: 'up' },
  { type: 'stove',           center: { x: 312, z: Z_D - 16 }, widthIn: 30, depthIn: 26, facing: 'up' },
  { type: 'kitchen_counter', center: { x: 366, z: Z_D - 16 }, widthIn: 66, depthIn: 25, facing: 'up' },
  { type: 'kitchen_island',  center: { x: 330, z: 300 },      widthIn: 72, depthIn: 36, facing: 'up' },

  // Bathroom 1 (off the hallway): vanity on the top wall, toilet and shower on the left wall.
  { type: 'sink_vanity',     center: { x: 108, z: Z_A + 14 }, widthIn: 42, depthIn: 22, facing: 'down' },
  { type: 'toilet',          center: { x: 18,  z: Z_A + 30 }, widthIn: 18, depthIn: 28, facing: 'right' },
  { type: 'shower',          center: { x: 26,  z: Z_B - 26 }, widthIn: 40, depthIn: 40, facing: 'right' },

  // Laundry closet: stacked washer/dryer against the back wall.
  { type: 'washer_dryer',    center: { x: 108, z: 282 },      widthIn: 30, depthIn: 32, facing: 'left' },

  // Bathroom 2 (off the hallway): vanity on the bottom wall, toilet and shower on the left wall.
  { type: 'sink_vanity',     center: { x: 108, z: Z_D - 14 }, widthIn: 42, depthIn: 22, facing: 'up' },
  { type: 'toilet',          center: { x: 18,  z: Z_C + 28 }, widthIn: 18, depthIn: 28, facing: 'right' },
  { type: 'shower',          center: { x: 26,  z: Z_D - 30 }, widthIn: 40, depthIn: 40, facing: 'right' },
];

const out = { spaces, doors, windows, fixtures };

const target = process.argv[2];
if (target) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', target);
}

export { spaces, doors, windows, fixtures };
