# Floor Plan Studio — 3D Apartment Walkthrough & Furniture Planner

Turn a floor plan image into a walkable 3D apartment, then furnish it. Claude reads the plan —
rooms, doors, windows, and built-in fixtures — and the result becomes a first-person space you
can walk through and decorate.

Built with Vite + React 19 + TypeScript + React Three Fiber.

## Try it

The hosted demo opens on a **pre-loaded example apartment** — a real traced 2-bedroom with walls,
doors, windows and kitchen/bath fixtures, and no loose furniture, so there's something to furnish
the moment it loads.

Everything below is **free and needs no key**:

- Orbit, top-down, and first-person walk mode
- Place, move, rotate, recolour and delete furniture
- Per-room paint and flooring
- Remove walls to open up a space
- Trace your own floor plan by hand from an uploaded image

Your work is saved in **your own browser** (IndexedDB). Nobody else sees your edits, and you
can't break the demo for anyone else.

## How to use it

### 1. Start with the example apartment

On first load you land on the dashboard with an **Example Apartment** already there. Click it to
open the editor — no setup, no key, nothing to configure. This is the fastest way to see what the
app does.

### 2. Move around

The toolbar at the top switches how you view the space:

| Button | What it does |
|---|---|
| **Orbit** | Drag to rotate, scroll to zoom, right-drag to pan. The default. |
| **Walk** | First-person. Click the scene to capture the mouse, then `WASD` to move (full key list below). |
| **Top** | Snaps to a straight-down floor-plan view. |
| **Walls** | Fades the walls to near-transparent so you can see into every room from outside. |

### 3. Add furniture

The left panel is the catalog, grouped by category with a search box at the top. Click any item to
drop it into the room currently selected in the **Room** dropdown above the catalog.

Once an item is in the scene:

- **Click it** to select. A panel appears with size, colour, rotation, and a delete button.
- **Drag it** to move. Drop it near a wall and it snaps flush, facing into the room.
- **Rotate** with the toolbar's rotate mode, or the selected-item panel.
- **Delete** with the `Delete` / `Backspace` key, or the toolbar button.

### 4. Redecorate

- **🎨 Room finishes** (left panel) — wall paint and flooring for one room at a time. Tile the
  bathroom, carpet a bedroom, paint an accent wall.
- **🧱 Remove wall** — turn the tool on, hover a wall until it highlights **red**, click to delete
  it. This is how you open a kitchen into a living room. `Ctrl+Z` puts it back.
- **📏 Measure** — click two points on the floor for the distance in feet and inches.
- **Undo / redo** — `Ctrl+Z` and `Ctrl+Shift+Z`, or the toolbar arrows. Covers furniture *and*
  wall edits.

### 5. Build your own apartment

Click **+ New Room** on the dashboard. You get two options:

- **Quick rectangular room** — type a width, length, and ceiling height. Best for a single room.
- **Trace from floor plan** — upload a floor plan image and turn it into a multi-room, walkable
  apartment. Inside the tracer you can either:
  - **✨ Analyze with AI** — reads the whole plan for you. Needs an API key (see below).
  - **Trace manually** — click each room's corners on top of the image and type the printed
    dimensions. Free, no key, and always available as a fallback if the AI misses something.

Everything you build is saved in **your own browser** (IndexedDB). It persists across reloads on
the same browser, is invisible to anyone else, and is lost if you clear site data.

## Optional: automatic floor plan reading

Uploading a plan image and having Claude read it costs money, so the app uses **your own
Anthropic API key**, entered in-app and stored only in your browser's `localStorage`. The
deployed site ships no key of its own.

| Action | Model | Typical cost |
|---|---|---|
| Analyze a floor plan | Claude Opus 5 (`medium` effort) | ~$0.25 |
| Match style from room photos | Claude Opus 5 (`low` effort) | ~$0.02 |
| Import a product from a store URL | Claude Haiku 4.5 | ~$0.01 |

Get a key at the [Anthropic Console](https://console.anthropic.com/settings/keys).

**API credits are separate from a Claude subscription.** A Claude Pro/Max plan does *not* include
API usage; add credits at console.anthropic.com → Plans & Billing. If they run out, the app says
so plainly. Without a key, every AI feature falls back to a manual path that still works.

### Adding your key in the app

Click **🔑 Add API key** on the dashboard, paste it in, and save. The panel shows the model and
per-action cost before you spend anything. The key is stored in your browser's `localStorage`,
sent as a request header, forwarded to Anthropic, and never stored on any server. Clear it any
time from the same panel.

## Setup (running it yourself)

Requires **Node.js 20+**.

```bash
git clone https://github.com/AneeshSingh22/Projects.git
cd Projects/floor-plan-studio
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Everything except the AI features works
immediately — the example apartment, manual tracing, 3D, walk mode, and all the design tools.

### Enabling the AI features locally

The API key can't safely live in browser code, so AI calls go through a small backend. Two ways:

**Option A — enter your key in the app** (nothing to configure). Click **🔑 Add API key** and run:

```bash
npm run dev:all      # frontend + local API server on port 8787
```

**Option B — put a key in `.env`** so you're not prompted during development:

```bash
cp .env.example .env     # then paste your key into ANTHROPIC_API_KEY=
npm run dev:all
```

`.env` is gitignored — never commit it. `.env.example` also documents the optional model and
effort overrides (`ANTHROPIC_MODEL`, `FLOOR_PLAN_EFFORT`, `STYLE_EFFORT`, `PRODUCT_MODEL`) with
the cost/accuracy benchmark behind each default.

Product import works better locally than deployed: the local server drives a headless browser,
which serverless functions can't. See `DEPLOY.md`.

### npm scripts

| Script | What it runs |
|---|---|
| `npm run dev` | Frontend only. AI calls will fail; everything else works. |
| `npm run dev:all` | Frontend + local API server (needed for AI features). |
| `npm run server` | The API server alone, on port 8787. |
| `npm run build` | Type-check and produce a production build in `dist/`. |

### Deploying your own copy

See [`DEPLOY.md`](./DEPLOY.md). The short version: import the repo on Vercel, set the **Root
Directory** to `floor-plan-studio`, and **do not** set `ANTHROPIC_API_KEY` — the site is
deliberately key-less so each visitor spends their own credit rather than yours.

The folder name has no spaces on purpose: Vercel derives serverless function names from the path
and rejects any that contain one.

## What the AI reads from a floor plan

One `Analyze with AI` call returns, in a single pass:

- **Rooms** — true polygon shapes (L-shapes, cut corners, open-concept pass-throughs), names,
  and printed dimensions, positioned so neighbouring rooms actually share their walls.
- **Doors** — every doorway, cased opening, and pass-through, auto-placed as wall-cutting
  openings so the apartment is walkable immediately.
- **Windows** — placed as glass openings in the exterior walls (impassable, unlike doors).
- **Fixtures** — kitchen counters/island, fridge, stove, washer/dryer, toilets, vanities,
  bathtubs, showers — placed where they're drawn on the plan.

## Walk mode (first-person, Sims-style)

Press **Walk**, then click the scene to capture the mouse.

| Key | Action |
|---|---|
| `WASD` / arrows | Move (`Shift` to sprint) |
| `E` | Pick up the item you're looking at / put it down |
| `1`–`9` | Spawn a hotbar item straight into your hands |
| Scroll / `R` | Rotate the carried item |
| Click | Place the carried item |
| `Esc` | Release the mouse |

A carried item follows your gaze as a translucent ghost. It turns **red** when it would clip
existing furniture or land outside a room, and placement is blocked until you move it somewhere
legal. You also physically collide with furniture and walls while walking (rugs and other
ankle-height pieces are stepped over).

The hotbar is keyboard-driven on purpose: while the pointer is locked the browser hides the
cursor, so on-screen buttons cannot be clicked.

## How it's built

| Area | Notes |
|---|---|
| Frontend | Vite 8, React 19, TypeScript, Tailwind CSS v4 |
| 3D | React Three Fiber + drei, `ACESFilmicToneMapping`, procedurally generated floor textures |
| State | Zustand, with an undo/redo history covering furniture *and* wall edits |
| Storage | IndexedDB (`idb`) — per-browser, no server database |
| AI | Anthropic SDK, structured JSON-schema output, streamed |
| Backend | Vercel serverless functions in `api/`; `server/index.js` mirrors them for local dev |

Geometry lives in `src/lib/floorPlan.ts`: point-in-polygon, wall deduplication with colinear
grouping and T-junction handling, ray–segment intersection for wall mounting, and
circle-vs-rotated-AABB collision for walking into furniture. Apartment coordinates are global
inches; scene units are feet.
