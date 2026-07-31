/**
 * Authors the example apartment as an exact tiling.
 *
 * The previous version came from an AI trace whose rooms overlapped and left gaps, so only 4 of 15
 * spaces were reachable. Here every room is defined against a shared grid of wall lines, so
 * neighbours share exact coordinates and every interior boundary carries a real door.
 *
 * Layout, 26' wide x 42' deep. A hallway spine runs left-to-right through the middle; every room
 * opens off it, so the whole apartment is walkable from anywhere.
 *
 *        x=0      108        192            312
 *   z=0   +--------------------+--------------+
 *         |  Living Room       |  Kitchen     |
 *         |                    |              |
 *   216   +--------+-----------+--------------+
 *         | Bath   |   Hallway (spine)        |
 *   300   +--------+--------------------------+
 *         | Closet |  Bedroom 1  |  Bedroom 2 |
 *         |        |             |            |
 *   504   +--------+-------------+------------+
 */

import fs from 'fs';

// Shared wall lines — every room references these, so edges match exactly.
const X0 = 0, X_A = 108, X_B = 192, X_C = 216, X1 = 312;
const Z0 = 0, Z_TOP = 216, Z_HALL = 300, Z1 = 504;

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

const spaces = [
  { id: 'space-0', name: 'Living Room', polygon: rect(X0,  Z0,     X_B, Z_TOP)  },
  { id: 'space-1', name: 'Kitchen',     polygon: rect(X_B, Z0,     X1,  Z_TOP)  },
  { id: 'space-2', name: 'Bathroom',    polygon: rect(X0,  Z_TOP,  X_A, Z_HALL) },
  { id: 'space-3', name: 'Hallway',     polygon: rect(X_A, Z_TOP,  X1,  Z_HALL) },
  { id: 'space-4', name: 'Closet',      polygon: rect(X0,  Z_HALL, X_A, Z1)     },
  { id: 'space-5', name: 'Bedroom 1',   polygon: rect(X_A, Z_HALL, X_C, Z1)     },
  { id: 'space-6', name: 'Bedroom 2',   polygon: rect(X_C, Z_HALL, X1,  Z1)     },
];

/**
 * Doors. Each sits exactly on a shared wall line, centred in the overlap between the two rooms.
 * Living<->Kitchen is a wide cased opening (>=72in), which the wall builder dissolves entirely so
 * the two read as one open-plan space.
 */
const doors = [
  { center: { x: X_B,  z: 108 },   widthIn: 84 },  // Living <-> Kitchen (open plan, dissolves wall)
  { center: { x: 150,  z: Z_TOP }, widthIn: 48 },  // Living <-> Hallway (cased opening)
  { center: { x: 252,  z: Z_TOP }, widthIn: 36 },  // Kitchen <-> Hallway
  { center: { x: X_A,  z: 258 },   widthIn: 30 },  // Hallway <-> Bathroom
  { center: { x: 54,   z: Z_HALL }, widthIn: 30 }, // Bathroom <-> Closet  (closet off the bath side)
  { center: { x: 156,  z: Z_HALL }, widthIn: 34 }, // Hallway <-> Bedroom 1
  { center: { x: 264,  z: Z_HALL }, widthIn: 34 }, // Hallway <-> Bedroom 2
];

// Windows on exterior walls only (x=X1 right side, z=Z0 top, z=Z1 bottom).
const windows = [
  { center: { x: 96,  z: Z0 }, widthIn: 72 },  // Living, front
  { center: { x: 252, z: Z0 }, widthIn: 48 },  // Kitchen, front
  { center: { x: X1,  z: 120 }, widthIn: 48 }, // Kitchen, side
  { center: { x: 156, z: Z1 }, widthIn: 60 },  // Bedroom 1, rear
  { center: { x: 264, z: Z1 }, widthIn: 60 },  // Bedroom 2, rear
];

/**
 * Built-ins. A fixture's `center` is its centre point, so anything against a wall must sit at
 * least half its depth away from that wall line (plus ~3in of wall thickness) or it renders
 * half-buried. Sideways-facing items swap width/depth, so their clearance uses widthIn.
 */
const W = 3; // wall half-thickness allowance
const fixtures = [
  // Kitchen: counter run + appliances along the top exterior wall (z = Z0), island floating.
  { type: 'fridge',          center: { x: 213, z: Z0 + W + 15 }, widthIn: 36,  depthIn: 30, facing: 'down' },
  { type: 'kitchen_counter', center: { x: 261, z: Z0 + W + 13 }, widthIn: 60,  depthIn: 25, facing: 'down' },
  { type: 'stove',           center: { x: 294, z: Z0 + W + 13 }, widthIn: 30,  depthIn: 26, facing: 'down' },
  // Island sits clear of the wide Living<->Kitchen opening (centred at x=192, 84in wide).
  { type: 'kitchen_island',  center: { x: 262, z: 140 },         widthIn: 72,  depthIn: 36, facing: 'down' },
  // Bathroom: toilet and shower on the left exterior wall, vanity on the top wall.
  { type: 'toilet',          center: { x: X0 + W + 14, z: 246 }, widthIn: 16,  depthIn: 28, facing: 'right' },
  { type: 'shower',          center: { x: X0 + W + 18, z: 276 }, widthIn: 36,  depthIn: 36, facing: 'right' },
  { type: 'sink_vanity',     center: { x: 76,  z: Z_TOP + W + 11 }, widthIn: 36, depthIn: 21, facing: 'down' },
  // Laundry stacked in the closet, against the left exterior wall.
  { type: 'washer_dryer',    center: { x: X0 + W + 15, z: 340 }, widthIn: 27,  depthIn: 30, facing: 'right' },
];

const out = { spaces, doors, windows, fixtures };

const target = process.argv[2];
if (target) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', target);
}

export { spaces, doors, windows, fixtures };
