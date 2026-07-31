/**
 * Authors the example apartment from the real DC floor plan.
 *
 * Coordinates are MEASURED, not guessed: wall lines were detected directly from the plan image's
 * pixels and converted at 1.93 px/in, a scale calibrated on the Living room's printed 14'5" x 16'6"
 * and then cross-checked against every other labelled room:
 *
 *     room      measured      printed
 *     Living    183 x 198     173 x 198
 *     Kitchen   214 x 107     207 x 110
 *     Bedroom 1 175 x 135     129 x 135   (label excludes the closet strip)
 *     Bedroom 2 175 x 138     132 x 135
 *
 * Earlier attempts derived geometry from AI traces of this plan. That does not work: the traces'
 * horizontal readings were reasonable but their vertical bounding boxes disagreed with the printed
 * dimensions by up to 2x, so rooms overlapped, walls were not shared, and doors had nothing to
 * attach to. Measuring the image directly avoids the whole problem.
 *
 * Door connections are read off the drawing, not invented. In particular: the kitchen opens to the
 * living room and the entry hall ONLY (there is no kitchen-to-bedroom door), and both bedrooms are
 * entered from the hall.
 */

import fs from 'fs';

// ---- Vertical wall lines (x, inches; measured px / 1.93) -----------------------------------
const X_L = 53;    // left exterior wall (baths / entry)
const X_A = 108;   // right edge of the baths
const X_B = 144;   // hall / service-core divider
const X_C = 197;   // right edge of the service core / kitchen left edge
const X_D = 239;   // left edge of the bedrooms (closet strip edge)
const X_LL = 231;  // living room left edge
const X_R = 413;   // right exterior wall

// ---- Horizontal wall lines (z, inches) -----------------------------------------------------
const Z_T = 15;     // top exterior (living room)
const Z_LIV = 213;  // living / kitchen divider
const Z_KIT = 330;  // kitchen / core divider (also top of Bedroom 1)
const Z_CORE = 371; // mech / W-D divider
const Z_MID = 415;  // bottom of the service core
const Z_B1 = 465;   // Bedroom 1 / Bedroom 2 divider
const Z_BA = 526;   // bath 1 / bath 2 divider
const Z_B = 604;    // bottom exterior

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

const spaces = [
  // Living: top-right, its left wall stepping in at the entry (as drawn).
  { id: 'space-0', name: 'Living', polygon: rect(X_LL, Z_T, X_R, Z_LIV) },

  // Kitchen: below the living room and open to it.
  { id: 'space-1', name: 'Kitchen', polygon: rect(X_C, Z_LIV, X_R, Z_KIT) },

  // Entry hall: enters top-left, runs down the middle past the service core to the bedrooms.
  {
    id: 'space-2', name: 'Entry Hall',
    polygon: [
      { x: X_L, z: Z_LIV }, { x: X_C, z: Z_LIV }, { x: X_C, z: Z_KIT },
      { x: X_B, z: Z_KIT }, { x: X_B, z: Z_B1 }, { x: X_L, z: Z_B1 },
    ],
  },

  // Service core off the hall: Mech and W/D stacked, bedroom closet to their right.
  { id: 'space-3', name: 'Mech',   polygon: rect(X_B, Z_KIT,  X_C, Z_CORE) },
  { id: 'space-4', name: 'W/D',    polygon: rect(X_B, Z_CORE, X_C, Z_MID)  },
  { id: 'space-5', name: 'Closet', polygon: rect(X_C, Z_KIT,  X_D, Z_MID)  },

  // Bedrooms down the right side.
  { id: 'space-6', name: 'Bedroom 1', polygon: rect(X_D, Z_KIT, X_R, Z_B1) },
  { id: 'space-7', name: 'Bedroom 2', polygon: rect(X_D, Z_B1,  X_R, Z_B)  },

  // Baths down the left side, and Bedroom 2's closet between them and the bedroom.
  { id: 'space-8',  name: 'Bath',     polygon: rect(X_L, Z_B1, X_A, Z_BA) },
  { id: 'space-9',  name: 'Bath 2',   polygon: rect(X_L, Z_BA, X_A, Z_B)  },
  { id: 'space-10', name: 'Closet 2', polygon: rect(X_A, Z_B1, X_D, Z_B)  },
];

/**
 * Doors, taken from the connections drawn on the plan. Openings >= 72in dissolve their wall
 * entirely, which is how the Living/Kitchen boundary reads as open-plan.
 */
const doors = [
  { center: { x: 320,  z: Z_LIV },  widthIn: 173 }, // Living <-> Kitchen (open plan, as drawn)
  { center: { x: X_C,  z: 270 },    widthIn: 72 },  // Kitchen <-> Entry Hall (wide cased opening)
  { center: { x: X_B,  z: 350 },    widthIn: 38 },  // Hall <-> Mech (bifold)
  { center: { x: X_B,  z: 393 },    widthIn: 38 },  // Hall <-> W/D (bifold)
  { center: { x: X_B,  z: Z_MID },  widthIn: 34 },  // Hall <-> Bedroom 1 (door drawn below the core)
  { center: { x: X_C,  z: 372 },    widthIn: 60 },  // Closet <-> service core
  { center: { x: X_D,  z: 372 },    widthIn: 60 },  // Bedroom 1 <-> its closet (bifold)
  { center: { x: 72,   z: Z_B1 },   widthIn: 30 },  // Hall <-> Bath
  { center: { x: X_A,  z: 560 },    widthIn: 30 },  // Bath 2 <-> Closet 2
  { center: { x: 70,   z: Z_BA },   widthIn: 30 },  // Bath <-> Bath 2
  { center: { x: X_D,  z: 545 },    widthIn: 32 },  // Closet 2 <-> Bedroom 2
];

// Windows on the exterior walls, matching the glazing drawn on the plan.
const windows = [
  { center: { x: X_R, z: 90 },  widthIn: 60 }, // Living, right wall
  { center: { x: X_R, z: 170 }, widthIn: 60 }, // Living, right wall
  { center: { x: X_R, z: 290 }, widthIn: 48 }, // Kitchen, right wall
  { center: { x: X_R, z: 400 }, widthIn: 48 }, // Bedroom 1
  { center: { x: X_R, z: 550 }, widthIn: 48 }, // Bedroom 2
];

/**
 * Built-ins. `center` is the centre point, so anything against a wall must sit at least half its
 * depth off the wall line (plus ~3in of wall thickness) or it renders half-buried. Sideways-facing
 * items swap width/depth, so their clearance uses widthIn.
 *
 * The kitchen run is drawn along the top of the kitchen strip (Ref, range, sink, DW, pantry), with
 * the island above it in the living space.
 */
const fixtures = [
  { type: 'fridge',          center: { x: 222, z: Z_LIV + 18 }, widthIn: 36, depthIn: 30, facing: 'down' },
  { type: 'stove',           center: { x: 268, z: Z_LIV + 16 }, widthIn: 30, depthIn: 26, facing: 'down' },
  { type: 'kitchen_counter', center: { x: 340, z: Z_LIV + 16 }, widthIn: 72, depthIn: 25, facing: 'down' },
  { type: 'kitchen_island',  center: { x: 322, z: 165 },        widthIn: 70, depthIn: 34, facing: 'down' },
  // Bath 1: vanity on the top wall, toilet on the left exterior wall.
  { type: 'sink_vanity',     center: { x: 96,       z: 500 },       widthIn: 30, depthIn: 20, facing: 'left' },
  { type: 'toilet',          center: { x: X_L + 15, z: 505 },       widthIn: 16, depthIn: 26, facing: 'right' },
  // Bath 2: shower, toilet and vanity along the left and bottom walls.
  { type: 'shower',          center: { x: X_L + 17, z: 566 },       widthIn: 30, depthIn: 30, facing: 'right' },
  { type: 'toilet',          center: { x: X_L + 15, z: 592 },       widthIn: 16, depthIn: 26, facing: 'right' },
  { type: 'sink_vanity',     center: { x: 88,       z: Z_B - 14 },  widthIn: 34, depthIn: 21, facing: 'up' },
];

const out = { spaces, doors, windows, fixtures };

const target = process.argv[2];
if (target) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', target);
}

export { spaces, doors, windows, fixtures };
