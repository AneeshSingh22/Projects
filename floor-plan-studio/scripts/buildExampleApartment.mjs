/**
 * Authors the example apartment: a hand-traced reproduction of the real DC 2-bedroom floor plan.
 *
 * Why hand-traced rather than AI-generated: the AI trace's horizontal readings were accurate
 * (within ~1-4in of the printed dimensions) but its vertical bboxes were not, so rooms overlapped
 * and left gaps. Doors can only attach to a wall shared by two rooms, so that geometry left 11 of
 * 15 rooms sealed off. Here every room is defined against a shared table of wall lines, so
 * neighbours share exact coordinates by construction and every interior boundary carries a door.
 *
 * Dimensions come from the labels printed on the plan:
 *   Living 14'5" x 16'6" | Kitchen 9'2" x 17'3" | Bedroom 1 10'9" x 11'3" | Bedroom 2 11' x 11'3"
 *
 * Plan structure, matching the original drawing:
 *   - Living room top-right, with the notched corner at its lower-left.
 *   - Kitchen directly below Living and open to it.
 *   - A service core between kitchen and bedrooms: Mech, W/D, Closet.
 *   - Bedroom 1 and Bedroom 2 stacked down the right side.
 *   - Two bathrooms down the left side.
 *   - Entry hall running down the left, connecting everything.
 */

import fs from 'fs';

// ---- Vertical wall lines (x, inches from the left edge of the plan) -------------------------
const X_W = 0;      // exterior left (entry hall / baths)
const X_BATH = 96;  // right edge of the bathrooms
const X_HALL = 130; // right edge of the hall corridor / left edge of the service core
const X_CORE = 214; // right edge of the service core
const X_BED = 214;  // left edge of the bedrooms
const X_E = 346;    // exterior right

// ---- Horizontal wall lines (z, inches from the top of the plan) ----------------------------
const Z_N = 0;      // top of the Living room
const Z_LIV = 198;  // Living is 16'6" deep -> bottom of Living / top of Kitchen
const Z_KIT = 300;  // bottom of the Kitchen / top of the service core
const Z_CORE = 420; // bottom of the service core
const Z_BED1 = 435; // bottom of Bedroom 1
const Z_MID = 450;  // top of Bedroom 2
const Z_S = 585;    // exterior bottom

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

const spaces = [
  // Living: top-right. 14'5" wide (173in) x 16'6" deep (198in).
  { id: 'space-0', name: 'Living', polygon: rect(173, Z_N, X_E, Z_LIV) },

  // Kitchen: below Living and open to it, 9'2" deep x 17'3" long running left-right.
  { id: 'space-1', name: 'Kitchen', polygon: rect(139, Z_LIV, X_E, Z_KIT) },

  // Entry hall down the left, widening at the top where the front door is.
  {
    id: 'space-2', name: 'Hall',
    polygon: [
      { x: X_W, z: Z_LIV }, { x: 139, z: Z_LIV }, { x: 139, z: Z_KIT },
      { x: X_HALL, z: Z_KIT }, { x: X_HALL, z: Z_BED1 }, { x: X_W, z: Z_BED1 },
    ],
  },

  // Service core between the kitchen and the bedrooms.
  { id: 'space-3', name: 'Mech',   polygon: rect(X_HALL, Z_KIT, 178,    348)    },
  { id: 'space-4', name: 'W/D',    polygon: rect(X_HALL, 348,   178,    Z_CORE) },
  { id: 'space-5', name: 'Closet', polygon: rect(178,    Z_KIT, X_CORE, Z_CORE) },

  // Bedrooms down the right side. Bedroom 1 is 10'9" x 11'3", Bedroom 2 is 11' x 11'3".
  { id: 'space-6', name: 'Bedroom 1', polygon: rect(X_BED, Z_KIT, X_E, Z_BED1) },
  { id: 'space-7', name: 'Bedroom 2', polygon: rect(X_BED, Z_MID, X_E, Z_S)    },

  // Bathrooms down the left side, with Bedroom 2's closet between them and the bedroom.
  { id: 'space-8',  name: 'Bath',     polygon: rect(X_W,    Z_BED1, X_BATH, 510) },
  { id: 'space-9',  name: 'Bath 2',   polygon: rect(X_W,    510,    X_BATH, Z_S) },
  { id: 'space-10', name: 'Closet 2', polygon: rect(X_BATH, Z_BED1, X_BED,  Z_S) },
];

/**
 * Doors, each centred on a shared wall line. Openings >= 72in are dissolved entirely by
 * dedupeWalls, which is how the Living/Kitchen boundary reads as open-plan.
 */
const doors = [
  { center: { x: 260,    z: Z_LIV },  widthIn: 120 }, // Living <-> Kitchen (open plan)
  { center: { x: 139,    z: 240 },    widthIn: 40 },  // Hall <-> Kitchen
  { center: { x: X_HALL, z: 324 },    widthIn: 72 },  // Hall <-> Mech (bifold)
  { center: { x: X_HALL, z: 384 },    widthIn: 72 },  // Hall <-> W/D (bifold)
  { center: { x: 196,    z: Z_KIT },  widthIn: 30 },  // Kitchen <-> Closet
  { center: { x: 280,    z: Z_KIT },  widthIn: 34 },  // Kitchen <-> Bedroom 1
  { center: { x: 280,    z: Z_MID },  widthIn: 34 },  // Bedroom 1 <-> Bedroom 2
  { center: { x: 40,     z: Z_BED1 }, widthIn: 30 },  // Hall <-> Bath
  { center: { x: X_BATH, z: 492 },    widthIn: 30 },  // Bath <-> Closet 2
  { center: { x: 48,     z: 510 },    widthIn: 30 },  // Bath <-> Bath 2
  { center: { x: X_BED,  z: 540 },    widthIn: 32 },  // Closet 2 <-> Bedroom 2
];

// Windows on exterior walls, matching the glazing drawn on the plan.
const windows = [
  { center: { x: X_E, z: 60 },  widthIn: 60 }, // Living, right wall
  { center: { x: X_E, z: 140 }, widthIn: 60 }, // Living, right wall
  { center: { x: 260, z: Z_N }, widthIn: 72 }, // Living, top wall
  { center: { x: X_E, z: 350 }, widthIn: 48 }, // Bedroom 1
  { center: { x: X_E, z: 520 }, widthIn: 48 }, // Bedroom 2
];

/**
 * Built-ins. `center` is the centre point, so anything against a wall must sit at least half its
 * depth off the wall line (plus ~3in of wall thickness) or it renders half-buried. Sideways-facing
 * items swap width/depth, so their clearance uses widthIn.
 */
const fixtures = [
  // Kitchen galley along the top of the kitchen (Ref, range, counter as drawn).
  { type: 'fridge',          center: { x: 186, z: Z_LIV + 18 }, widthIn: 36, depthIn: 30, facing: 'down' },
  { type: 'stove',           center: { x: 222, z: Z_LIV + 16 }, widthIn: 30, depthIn: 26, facing: 'down' },
  { type: 'kitchen_counter', center: { x: 282, z: Z_LIV + 16 }, widthIn: 60, depthIn: 25, facing: 'down' },
  // Island in the living room, as drawn on the plan.
  { type: 'kitchen_island',  center: { x: 268, z: 156 },        widthIn: 72, depthIn: 36, facing: 'down' },
  // Laundry in the W/D closet.
  { type: 'washer_dryer',    center: { x: 158, z: 403 },        widthIn: 27, depthIn: 30, facing: 'down' },
  // Bath 1 along the left exterior wall.
  { type: 'sink_vanity',     center: { x: 74,       z: Z_BED1 + 14 }, widthIn: 36, depthIn: 21, facing: 'down' },
  { type: 'toilet',          center: { x: X_W + 17, z: 468 },        widthIn: 16, depthIn: 28, facing: 'right' },
  // Bath 2 along the left exterior wall.
  { type: 'shower',          center: { x: X_W + 21, z: 552 },        widthIn: 36, depthIn: 36, facing: 'right' },
  { type: 'toilet',          center: { x: X_W + 17, z: 570 },        widthIn: 16, depthIn: 28, facing: 'right' },
  { type: 'sink_vanity',     center: { x: 74,       z: Z_S - 14 },   widthIn: 36, depthIn: 21, facing: 'up' },
];

const out = { spaces, doors, windows, fixtures };

const target = process.argv[2];
if (target) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', target);
}

export { spaces, doors, windows, fixtures };
