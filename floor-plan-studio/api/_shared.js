// Shared AI contract: JSON schemas, prompts, and error mapping.
//
// Imported by BOTH runtimes so they can never drift apart:
//   - server/index.js      local dev (Express, long-running, can drive a headless browser)
//   - api/*.js             Vercel serverless functions for the deployed site
//
// Model/effort defaults live here too; see docs/floor-plan-gap-filling-spec.md for the benchmark
// behind each choice.

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
// `medium` is the cost/quality compromise for a public demo: measured at ~$0.26 vs ~$0.51 at
// `high`, with the same 4/4 room-placement accuracy. Room *shape* quality is a little softer than
// high, but the remove-wall tool lets users clean that up by hand for free.
export const FLOOR_PLAN_EFFORT = process.env.FLOOR_PLAN_EFFORT || 'medium';
export const STYLE_EFFORT = process.env.STYLE_EFFORT || 'low';
// Reading a product page is a straightforward extraction task, not spatial reasoning — Haiku
// handles it at ~1/5 the price of Opus (≈$0.01 vs ≈$0.06 per import).
export const PRODUCT_MODEL = process.env.PRODUCT_MODEL || 'claude-haiku-4-5';

export const MISSING_KEY_MESSAGE =
  'No Anthropic API key provided. Add your key in the app (it stays in your browser and is only ' +
  'used to talk to Anthropic), or trace your floor plan manually — that works with no key at all.';

/** Parses the structured payload out of a response, tolerating SDKs that leave parsed_output null
 * for raw JSON schemas (as opposed to zodOutputFormat). */
export function parseStructured(response) {
  if (response.parsed_output) return response.parsed_output;
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return JSON.parse(text);
}

export const ROOM_SCHEMA = {
  type: 'object',
  properties: {
    rooms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "The room's printed label, e.g. 'Living Room', 'Bedroom 1', 'Kitchen'.",
          },
          polygon: {
            type: 'array',
            description:
              'Corners of the room, tracing the INTERIOR face of its walls in order (clockwise or counterclockwise, but consistent). Use as many points as needed to capture the true shape (L-shapes, cut corners, bump-outs) — do not simplify a non-rectangular room down to 4 corners.',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'Fraction of image width, 0 = left edge, 1 = right edge.' },
                y: { type: 'number', description: 'Fraction of image height, 0 = top edge, 1 = bottom edge.' },
              },
              required: ['x', 'y'],
              additionalProperties: false,
            },
          },
          widthIn: {
            type: 'number',
            description:
              "The first printed dimension for this room, converted to total inches (feet*12 + inches). 0 if no dimension text is printed for this room.",
          },
          depthIn: {
            type: 'number',
            description: 'The second printed dimension for this room, converted to total inches. 0 if unknown.',
          },
        },
        required: ['name', 'polygon', 'widthIn', 'depthIn'],
        additionalProperties: false,
      },
    },
    doors: {
      type: 'array',
      description:
        'Every doorway, cased opening, or open pass-through connecting two spaces (or connecting a space to the outside). Include one entry per opening a person can physically walk through.',
      items: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'Center of the opening, as a fraction of image width (0-1).' },
          y: { type: 'number', description: 'Center of the opening, as a fraction of image height (0-1).' },
          widthIn: {
            type: 'number',
            description:
              'Width of the opening in inches. Use 32 for a standard interior door, 36 for an entry door, and the true measured width for a wide cased opening or open pass-through.',
          },
          connects: {
            type: 'array',
            description: 'Names of the two rooms this opening connects, exactly as given in the rooms array. Use one name if it leads outside.',
            items: { type: 'string' },
          },
        },
        required: ['x', 'y', 'widthIn', 'connects'],
        additionalProperties: false,
      },
    },
    windows: {
      type: 'array',
      description:
        'Every window on the exterior walls. On architectural plans windows are drawn as thin double/triple parallel lines within the wall, often with a slightly different line weight than the wall itself.',
      items: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'Center of the window, as a fraction of image width (0-1).' },
          y: { type: 'number', description: 'Center of the window, as a fraction of image height (0-1).' },
          widthIn: {
            type: 'number',
            description: 'Width of the window along the wall, in inches, measured at the plan scale.',
          },
          room: { type: 'string', description: 'Name of the room this window belongs to, exactly as given in the rooms array.' },
        },
        required: ['x', 'y', 'widthIn', 'room'],
        additionalProperties: false,
      },
    },
    fixtures: {
      type: 'array',
      description:
        'Every built-in fixture drawn or labeled on the plan: kitchen counters/cabinets, kitchen island, refrigerator (Ref), stove/range, dishwasher-containing counter runs, washer/dryer (W/D), toilets, sinks/vanities, bathtubs, showers, built-in desks.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'kitchen_counter',
              'kitchen_island',
              'fridge',
              'stove',
              'washer_dryer',
              'toilet',
              'sink_vanity',
              'bathtub',
              'shower',
              'desk',
            ],
          },
          x: { type: 'number', description: 'Center of the fixture, as a fraction of image width (0-1).' },
          y: { type: 'number', description: 'Center of the fixture, as a fraction of image height (0-1).' },
          widthIn: { type: 'number', description: "Fixture's left-right extent ON THE IMAGE, in inches at the plan scale." },
          depthIn: { type: 'number', description: "Fixture's top-bottom extent ON THE IMAGE, in inches at the plan scale." },
          facing: {
            type: 'string',
            enum: ['up', 'down', 'left', 'right'],
            description:
              "Direction the fixture's front/open side faces on the image — i.e. away from the wall it sits against. A counter on the left wall faces 'right'.",
          },
          room: { type: 'string', description: 'Name of the room containing this fixture, exactly as in the rooms array.' },
        },
        required: ['type', 'x', 'y', 'widthIn', 'depthIn', 'facing', 'room'],
        additionalProperties: false,
      },
    },
  },
  required: ['rooms', 'doors', 'windows', 'fixtures'],
  additionalProperties: false,
};

export const STYLE_SCHEMA = {
  type: 'object',
  properties: {
    floor: {
      type: 'object',
      properties: {
        material: { type: 'string', enum: ['wood', 'tile', 'carpet', 'concrete'] },
        colorHex: { type: 'string', description: "Dominant flooring color as '#rrggbb' — the average plank/tile tone." },
        accentHex: { type: 'string', description: "Secondary flooring tone as '#rrggbb' (darker plank variation, grout, etc.)." },
      },
      required: ['material', 'colorHex', 'accentHex'],
      additionalProperties: false,
    },
    wallHex: { type: 'string', description: "Wall paint color as '#rrggbb'." },
    baseboardHex: { type: 'string', description: "Baseboard/trim color as '#rrggbb'." },
    baseboardHeightIn: { type: 'number', description: 'Approximate baseboard height in inches (typically 3-6).' },
    windowFrameHex: { type: 'string', description: "Window frame color as '#rrggbb' (e.g. black aluminum = '#1a1a1a')." },
    windowSillIn: {
      type: 'number',
      description: 'Typical height of the window sill off the floor in inches. Use 0 for floor-to-ceiling glass.',
    },
    windowHeadIn: {
      type: 'number',
      description: 'Typical height of the window top off the floor in inches (e.g. 96 for 8ft, up to ceiling height for full-height glass).',
    },
  },
  required: ['floor', 'wallHex', 'baseboardHex', 'baseboardHeightIn', 'windowFrameHex', 'windowSillIn', 'windowHeadIn'],
  additionalProperties: false,
};

export const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short product name, e.g. "KIVIK 3-Seat Sofa" or "Rivet Mid-Century Sofa".' },
    category: {
      type: 'string',
      enum: ['seating', 'tables', 'storage', 'bedroom', 'kitchen', 'bathroom', 'decor', 'electronics'],
    },
    shape: {
      type: 'string',
      description:
        'Which built-in 3D form best matches this product, so it renders with the right silhouette.',
      enum: [
        'sofa', 'armchair', 'chair', 'coffeeTable', 'sideTable', 'diningTable', 'desk',
        'bookshelf', 'dresser', 'nightstand', 'tvStand', 'bed', 'rug', 'lamp', 'plant',
        'tv', 'painting', 'box',
      ],
    },
    widthIn: { type: 'number', description: 'Width in inches. Convert from cm if the listing uses metric.' },
    depthIn: { type: 'number', description: 'Depth in inches.' },
    heightIn: { type: 'number', description: 'Height in inches.' },
    colorHex: { type: 'string', description: "Dominant product color as '#rrggbb', judged from the photo." },
    wallMounted: { type: 'boolean', description: 'True only for things that hang on a wall (TVs, art, shelves).' },
    dimensionsFound: {
      type: 'boolean',
      description: 'True if real dimensions were stated on the page; false if you had to estimate from a typical product of this kind.',
    },
  },
  required: ['name', 'category', 'shape', 'widthIn', 'depthIn', 'heightIn', 'colorHex', 'wallMounted', 'dimensionsFound'],
  additionalProperties: false,
};

export const PRODUCT_PROMPT = `You are given a furniture product page: its visible text, and its main product image.

Extract what is needed to place this item into a 3D room plan:
- The product name (keep it short — brand + model, not the full SEO title).
- Its real dimensions in INCHES. Product pages state these as W x D x H, sometimes in centimetres — convert (1 in = 2.54 cm). Depth is sometimes called "length". If the page gives only two numbers for a rug or art, treat the third (thickness) as small.
- Which of the listed built-in shapes best matches the product's silhouette, so it renders sensibly.
- The dominant colour, judged from the IMAGE rather than the title (titles lie; "grey" listings are often beige).
- Whether it hangs on a wall.

Set dimensionsFound to true ONLY if the page actually stated dimensions. If it did not and you are inferring from a typical product of this type, set it to false and give your best realistic estimate — never invent a precise-looking number and claim it was found.

Return only the structured data.`;

export const STYLE_PROMPT = `These are photos of the inside of one apartment. Extract its interior finishes so a 3D model can be styled to match. Judge colors from the well-lit parts of the photos and return average, representative tones (not shadow or glare regions): the flooring material and its dominant + secondary colors, the wall paint color, the baseboard color and approximate height, the window frame color, and the typical window sill/top heights off the floor (0 sill for floor-to-ceiling glass). Return only the structured data.`;

export const PROMPT = `This image is an architectural floor plan. Read it the way an architect would, then output the room layout as structured data.

CRITICAL — COVER THE ENTIRE FLOOR. Every square foot of walkable space inside the apartment's outer walls must belong to exactly one room polygon. This is the single most important requirement, more important than getting any individual room's shape perfect.

Work in this order:
1. First trace the apartment's full outer boundary — the outline of everything inside the exterior walls.
2. Then partition that ENTIRE boundary into rooms. Think of it as tiling: the room polygons together must fill the outline completely, like puzzle pieces with no leftover space.
3. Before you finish, mentally scan the whole outline for any leftover region. If you find one, it belongs to some room — either extend the neighbouring room's polygon to absorb it, or emit it as its own space.

The most commonly missed regions, which you MUST include:
- CIRCULATION SPACE: hallways, corridors, and the connecting spine between rooms. These are rarely labeled on a plan but are essential — they are how a person physically walks from the entry to each bedroom. If two rooms are far apart, there is almost always circulation floor between them that must be its own polygon (name it "Hall" or "Hallway").
- The entry/foyer area just inside the front door.
- SMALL LABELED UTILITY SPACES. Every box on the plan labeled Mech, W/D, WH, Closet, Pantry, Linen, Desk, or similar is a real enclosed space and MUST get its own polygon, no matter how small — even if it is only 2ft x 3ft. These are frequently skipped and each one leaves a hole in the floor. Go through the plan label by label and confirm you emitted a polygon for every single one.
- Alcoves, nooks, jogs beside closets, and the floor a desk or bed occupies.
- Any pocket of floor between a bathroom and a bedroom, or beside a laundry/mechanical closet.

A person must be able to walk from the front door to EVERY room without ever crossing floor you failed to include. If your rooms don't connect into one continuous walkable region, you have made an error — go back and add the missing circulation space.

For EVERY distinct enclosed room or named space shown (bedrooms, living room, kitchen, dining room, bathrooms, offices, dens — skip only tiny unlabeled closets/mechanical niches under about 12 square feet if including them would just add clutter):

1. Trace its polygon as a sequence of corners, tracing the INTERIOR face of the walls (the actual floor area, not the outer wall edge). Use normalized coordinates: x is the fraction of the image's total width (0 = left edge, 1 = right edge), y is the fraction of the image's total height (0 = top, 1 = bottom). If a room is not a simple rectangle (L-shaped, a cut/angled corner, a bump-out, an open pass-through into another room), include every corner needed to capture that real shape — do not flatten it to 4 points.

2. Get the room's proportions and position right relative to every OTHER room in the same image — a room's polygon must actually touch/align with its real neighbors' polygons along their shared wall, the same way they visibly connect in the image. This matters more than precise pixel accuracy: the goal is a set of rooms that, placed together, form a single connected, walkable apartment with no gaps and no overlaps at shared walls, matching the real adjacency shown in the plan (including open pass-throughs like an open-concept living/kitchen area — if two spaces are not separated by a wall in the image, their two polygons should share that open boundary, not be walled off from each other).

3. Read the printed dimension text near/inside the room (formats like 14'5" x 16'6", 9'2" X 17'3", 10'-9" x 11'-3"). Convert the first number to total inches (feet*12 + inches) as widthIn, and the second as depthIn. If you cannot find printed dimensions for a room, set both to 0 — do not guess a number that isn't printed on the plan.

4. Use the room's printed label as its name (e.g. "Living Room", "Bedroom 1", "Primary Bath"). If unlabeled, give it a short reasonable name based on context (e.g. "Closet", "Hall Bath").

Then, separately, find EVERY door and opening. On an architectural plan a hinged door is drawn as a gap in the wall with a thin straight leaf line and a quarter-circle arc showing its swing; a cased opening or pass-through is drawn as a plain gap in the wall with no arc. For each one, give the center point of the gap in the same normalized coordinates, its width in inches, and the names of the two rooms it connects (matching the names you used above).

Also find EVERY window: on the plan they appear as thin double/triple parallel lines set within an exterior wall segment. For each, give its center point, its width along the wall in inches, and which room it belongs to. Long window walls (e.g. a living room's full glass wall) may be drawn as several adjacent window symbols — report each segment separately.

Also find every built-in FIXTURE so the 3D model starts with the real kitchen and bathrooms in place: kitchen counter/cabinet runs (rectangles along kitchen walls, often containing a sink circle, stove burners, or a DW label — one entry per straight run), the kitchen island (freestanding counter rectangle), refrigerator (Ref), stove/range if drawn separately, washer/dryer (W/D), each toilet (small oval + tank), each bathroom sink/vanity (rectangle with basin circle), each bathtub (large rounded rectangle), each shower (square with X or glass lines), and labeled built-in desks. For each give: its type, center point (normalized), its left-right and top-bottom extents ON THE IMAGE in inches at the plan scale, which direction its front faces (away from the wall it sits against), and its room. Do not invent fixtures that are not drawn.

This part matters as much as the rooms: the output is used to make the apartment walkable in 3D, so a missed door leaves two rooms permanently sealed off from each other. Every room you emit must be reachable — walk the plan mentally from the entry and confirm each room has at least one opening into it. Include the exterior entry door, every bedroom and bathroom door, every closet door, and every wall gap between spaces (for example, where a kitchen opens into a living room with no door, that is still an opening and must be listed with its true width).

Return only the structured data.`;

/** Turns an SDK error into something the user can act on — billing and auth failures are the
 * common ones and are otherwise buried inside a generic message. */
export function describeApiError(err) {
  const inner = err?.error?.error?.message ?? (err instanceof Error ? err.message : '');
  if (/credit balance is too low/i.test(inner)) {
    return 'Your Anthropic API credits have run out. Add credits at console.anthropic.com → Plans & Billing, then try again. (This is separate from a Claude subscription.)';
  }
  if (err?.status === 401 || /authentication|invalid x-api-key/i.test(inner)) {
    return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env and restart the server.';
  }
  if (err?.status === 429) {
    return 'Anthropic API rate limit hit. Wait a moment and try again.';
  }
  return inner || 'Unknown error calling the Claude API.';
}

