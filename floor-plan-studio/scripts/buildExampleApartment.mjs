/**
 * Authors the example apartment: a purpose-built, realistic 2-bed / 2-bath.
 *
 * This is deliberately NOT a trace of any real plan. It is the app's shop window, so it is designed
 * to look like an apartment somebody actually lives in.
 *
 * Two earlier versions failed in opposite directions and both are guarded against now:
 *   - A traced version left 278 sqft of void (19% of the footprint)  -> checkCoverage.mjs
 *   - A tiled version had a 34' x 7' bedroom (4.9:1)                 -> checkProportions.mjs
 *
 * Design principles here:
 *   - Every bedroom has its OWN en-suite bathroom, as in a real 2-bed/2-bath.
 *   - Rooms are squarish (all habitable rooms under 1.6:1).
 *   - The footprint is an L, not a perfect rectangle — real buildings have corners cut for
 *     lightwells, stairs and neighbouring units.
 *   - A short entry hall, not a 21ft corridor.
 *
 * Layout (x left->right, z top->bottom), overall 32' x 38' on an L footprint:
 *
 *        x=0        168       228        384
 *   z=0   +----------------------+  (notch)
 *         |  Living / Dining     |
 *         |  14' x 16'           +-------------+
 *   192   +--------+-------------+  Bedroom 1  |
 *         | Kitchen| Entry       |  13' x 14'  |
 *         | 12'x11'| Hall        |             |
 *   324   +--------+------+------+------+------+
 *         |  Bedroom 2    | Laun |  Bath 1     |
 *         |  13' x 13'    | dry  |  8' x 8'    |
 *   456   +---------------+------+-------------+
 */

import fs from 'fs';

// ---- Vertical wall lines (x, inches) --------------------------------------------------------
const X0 = 0;     // left exterior
const X_A = 150;  // kitchen / entry-hall divider
const X_B = 234;  // entry hall / bedroom-1 divider
const X_BR2 = 168;   // bedroom-2 / its en-suite divider
const X_LAUNR = 288; // right edge of the laundry closet
const X_LAUN = 264; // bathroom-2 / laundry divider
const X_C = 312;   // laundry / bathroom-1 divider
const X_D = 384;  // right exterior (32 ft)

// ---- Horizontal wall lines (z, inches) ------------------------------------------------------
const Z0 = 0;     // top exterior
const Z_NOTCH = 96;  // where the building steps in on the right (the L)
const Z_A = 192;  // bottom of the living/dining room
const Z_B = 300;  // bottom of kitchen / entry hall / bedroom 1
const Z_LAUN2 = 234; // top of the laundry closet (a reach-in off the kitchen)
const Z_WIC = 372; // walk-in closet / bathroom-2 divider
const Z_C = 468;  // bottom exterior

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

const spaces = [
  // Living/dining occupies the top, stepping out to the right below the notch.
  {
    id: 'space-0', name: 'Living Room',
    polygon: [
      { x: X0, z: Z0 }, { x: X_B, z: Z0 }, { x: X_B, z: Z_NOTCH },
      { x: X_B, z: Z_A }, { x: X0, z: Z_A },
    ],
  },

  // Kitchen tucks under the living room on the left, open to it.
  { id: 'space-1', name: 'Kitchen', polygon: rect(X0, Z_A, X_B, Z_B) },

  // Bedroom 1 with its own en-suite directly below it.
  {
    id: 'space-3', name: 'Bedroom 1',
    polygon: [
      { x: X_B, z: Z_NOTCH }, { x: X_D, z: Z_NOTCH }, { x: X_D, z: Z_B },
      { x: X_LAUNR, z: Z_B }, { x: X_LAUNR, z: Z_LAUN2 }, { x: X_B, z: Z_LAUN2 },
    ],
  },
  { id: 'space-4', name: 'Bathroom 1', polygon: rect(X_C, Z_B, X_D, Z_C) },

  // Bedroom 2 across the bottom-left with its own en-suite between it and bath 1.
  { id: 'space-5', name: 'Bedroom 2',  polygon: rect(X0, Z_B, X_BR2, Z_C) },
  { id: 'space-6', name: 'Bathroom 2', polygon: rect(X_BR2, Z_WIC, X_C, Z_C) },
  { id: 'space-8', name: 'Closet',     polygon: rect(X_BR2, Z_B,   X_C, Z_WIC) },
  { id: 'space-7', name: 'Laundry',    polygon: rect(X_B, Z_LAUN2, X_LAUNR, Z_B) },
];

/**
 * Doors. Each sits on a wall the two rooms genuinely share, offset from corners. Openings >= 72in
 * dissolve their wall entirely, which is how the living room and kitchen read as one space.
 */
const doors = [
  { center: { x: 72,  z: Z_A }, widthIn: 96 },  // Living <-> Kitchen (open plan)
  { center: { x: 186, z: Z_A }, widthIn: 72 },  // Living <-> Kitchen (second open span)
  { center: { x: X_B, z: 150 }, widthIn: 34 },  // Living Room <-> Bedroom 1
  { center: { x: X_B, z: 264 }, widthIn: 32 },  // Kitchen <-> Bedroom 1
  { center: { x: 348, z: Z_B }, widthIn: 30 },  // Bedroom 1 -> its en-suite (Bathroom 1)
  { center: { x: 96,  z: Z_B }, widthIn: 34 },  // Kitchen <-> Bedroom 2
  { center: { x: X_BR2, z: 420 },    widthIn: 30 },  // Bedroom 2 -> its en-suite (Bathroom 2)
  { center: { x: X_BR2, z: 336 },    widthIn: 48 },  // Bedroom 2 -> walk-in closet (bifold)
  { center: { x: X_B, z: 267 },      widthIn: 30 },  // Kitchen -> Laundry closet
];

// Windows on exterior walls only. Every habitable room gets daylight; the baths are interior.
const windows = [
  { center: { x: 72,  z: Z0 },  widthIn: 72 }, // Living, front
  { center: { x: 180, z: Z0 },  widthIn: 48 }, // Living, front
  { center: { x: X0,  z: 96 },  widthIn: 60 }, // Living, left
  { center: { x: X0,  z: 258 }, widthIn: 48 }, // Kitchen, left
  { center: { x: X_D, z: 240 }, widthIn: 60 }, // Bedroom 1, right
  { center: { x: 72,  z: Z_C }, widthIn: 60 }, // Bedroom 2, rear
];

/**
 * Built-ins. `center` is the centre point, so anything against a wall sits half its depth plus ~3in
 * of wall thickness off that wall line. Sideways-facing items swap width/depth.
 */
const fixtures = [
  // Kitchen: a galley run down the left wall plus an island facing the living room.
  { type: 'fridge',          center: { x: 24,  z: 210 }, widthIn: 33, depthIn: 30, facing: 'down' },
  { type: 'stove',           center: { x: 64,  z: 208 }, widthIn: 30, depthIn: 26, facing: 'down' },
  { type: 'kitchen_counter', center: { x: 124, z: 208 }, widthIn: 60, depthIn: 25, facing: 'down' },
  { type: 'kitchen_island',  center: { x: 96,  z: 262 }, widthIn: 66, depthIn: 32, facing: 'down' },

  // Bathroom 1 (en-suite to Bedroom 1): vanity, toilet, shower.
  { type: 'sink_vanity', center: { x: 348, z: 328 },  widthIn: 40, depthIn: 21, facing: 'down' },
  { type: 'toilet',      center: { x: 366, z: 388 },  widthIn: 18, depthIn: 26, facing: 'left' },
  { type: 'shower',      center: { x: 348, z: 440 },  widthIn: 38, depthIn: 38, facing: 'up' },

  // Bathroom 2 (en-suite to Bedroom 2): vanity, toilet, shower.
  { type: 'sink_vanity', center: { x: 252, z: Z_WIC + 14 }, widthIn: 40, depthIn: 21, facing: 'down' },
  { type: 'toilet',      center: { x: 297, z: 414 },       widthIn: 18, depthIn: 28, facing: 'left' },
  { type: 'shower',      center: { x: 291, z: Z_C - 26 },    widthIn: 38, depthIn: 38, facing: 'up' },

  // Laundry: stacked washer/dryer in its reach-in closet off the kitchen.
  { type: 'washer_dryer', center: { x: 270, z: 267 }, widthIn: 30, depthIn: 32, facing: 'right' },
];

const out = { spaces, doors, windows, fixtures };

const target = process.argv[2];
if (target) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', target);
}

export { spaces, doors, windows, fixtures };
