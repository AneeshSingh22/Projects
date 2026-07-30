# Spec: Watertight floor plans (snap-and-fill)

**Status:** not started. Written 2026-07-29 at the end of a session, for a fresh session to implement.

## Problem

The AI floor-plan analyzer (`POST /api/analyze-floor-plan`) reliably finds the *right rooms* — 16 of
them on the reference plan, correctly named, correctly positioned relative to each other. What it
does **not** do is emit polygons that tile. Each room comes back as an independent rectangle, so
adjacent rooms end up separated by hairline-to-few-inch gaps.

Those gaps render as white slivers in the tracer preview and as holes in the 3D floor, which is what
breaks free walking around the apartment.

### Evidence this is not fixable by prompting

Coverage was measured as: sample a 120×120 grid over the bounding box of all rooms, count the
fraction of sample points falling inside at least one room polygon.

| Run | Rooms found | Coverage |
|---|---|---|
| Opus 5, effort `low`, original prompt | 14 | 72.9% |
| Opus 5, effort `medium`, original prompt | 11 | 74.0% |
| Opus 5, effort `high`, original prompt | 10 | 72.7% |
| Opus 5, effort `low`, hardened coverage prompt | 15 | 73.5% |
| Opus 5, effort `low`, hardened prompt (user run) | 16 | — |

Coverage is flat at ~73% across **every** effort level and **both** prompt versions, even as the
room count climbs. Raising effort costs 2–4× more and changes nothing. Conclusion: asking a language
model to emit ~16 polygons whose edges match exactly is a constraint-satisfaction task it will not
do reliably at any price. Solve it in code instead.

> Note: ~73% is measured against the *bounding box*, and the reference apartment is L-shaped, so
> perfect tracing would never reach 100%. Do not treat 100% as the target — use the visual overlay
> (below) and the "no gap between neighbours" property as the real acceptance criteria.

## Scope

Pure post-processing on the AI's output. No new API calls, no added per-trace cost. Runs client-side
after `analyzeFloorPlanWithAi()` returns and before `dedupeWalls()` builds the wall set.

## Where it goes

- New file: `src/lib/floorPlanTiling.ts`
- Called from: `src/components/floorplan/FloorPlanTracer.tsx`, inside `runAiDetect()`, on the
  `rooms` array *before* it is handed to `finalizeDetection()`.
- Everything downstream (`dedupeWalls`, `ApartmentShell`, walk collision) already consumes
  `RawTracedSpace[]` and needs no changes — it just receives better input.

Signature:

```ts
export function makeWatertight(
  spaces: RawTracedSpace[],
  opts?: { snapToleranceIn?: number; minSliverAreaSqIn?: number },
): RawTracedSpace[];
```

## Algorithm

### Step 1 — Axis snapping (does most of the work)

Real floor plans are overwhelmingly axis-aligned, and the AI's error is small and unbiased. So:

1. Collect every vertex X coordinate across all rooms into one list; same for Z.
2. Sort, then cluster values that are within `snapToleranceIn` (default **4in**) of each other.
3. Replace every value in a cluster with the cluster's mean.
4. Rewrite all polygons using the snapped coordinates.

This alone collapses "Bedroom 1's left edge at x=118.3" and "Hall's right edge at x=121.0" onto a
single shared x=119.65, which closes the sliver between them. Expect this to fix the large majority
of visible gaps.

**Watch out:** cluster greedily in sorted order, but cap total cluster width (e.g. 2× tolerance) so a
long chain of near-misses doesn't collapse two genuinely distinct walls 10in apart into one.

### Step 2 — Sliver absorption (handles the rest)

After snapping, some gaps remain where the AI got a room's *extent* wrong rather than its edge
position (e.g. Hall stops 8in short of Bedroom 2).

1. Build the apartment outline = union of all room polygons, then take its outer boundary
   (or, simpler and adequate: the concave-ish outline approximated by the union's bounding
   rectangle minus regions no room touches — see "Simplifications" below).
2. Compute `leftover = outline − union(rooms)`.
3. For each connected leftover region with area ≥ `minSliverAreaSqIn` (default **144 sq in** = 1 sq ft):
   - Find the room sharing the longest boundary with it.
   - Extend that room's polygon to absorb the region.
4. Discard leftovers below the threshold (rendering noise, not real floor).

### Step 3 — Validation (drives the acceptance test)

Return diagnostics alongside the spaces so the tracer can warn the user:

```ts
export interface TilingReport {
  gapsClosedBySnapping: number;
  sliversAbsorbed: number;
  /** regions still unassigned after both passes, in sq ft */
  remainingGapAreaSqFt: number;
  /** rooms that share no boundary with any other room — likely a detection error */
  isolatedRooms: string[];
}
```

`isolatedRooms` is the useful one: a room touching nothing else means the AI misplaced it, and the
tracer should flag it rather than silently produce an unwalkable apartment.

## Simplifications worth taking

Full polygon boolean ops (union/difference on arbitrary polygons) are the "correct" implementation
but are a lot of code and easy to get subtly wrong. Two cheaper routes, in order of preference:

1. **Rasterize.** Sample the bounding box on a fine grid (~1in cells). Mark cells covered by each
   room. Leftover = covered-by-outline but not by any room. Flood-fill leftovers into connected
   regions, then absorb each into its longest-adjacent room by extending that room's rectangle.
   Cheap, robust, and precision beyond ~1in is irrelevant here.
2. **Rectangle-only assumption.** After Step 1 nearly every room is an axis-aligned rectangle.
   Gap-filling between rectangles is 1D interval arithmetic per axis — far simpler than general
   polygons. Fall back to leaving non-rectangular rooms untouched.

Do **not** pull in a polygon-clipping dependency for this unless Steps 1–2 prove insufficient.

## Testing (all free — no API calls)

Real AI outputs are checked in at `test-fixtures/floor-plans/` — no API calls needed to iterate:

```
cov-claude-opus-5-low.json      15 rooms, hardened prompt  (73.5% coverage)
bench-claude-opus-5-low.json    14 rooms                   (72.9%)
bench-claude-opus-5-medium.json 11 rooms                   (74.0%)
bench-claude-opus-5-high.json   10 rooms                   (72.7%)
```

Two harnesses live alongside them (run from that directory):

- `node measure.mjs <file.json>` — prints room count, coverage %, and detected circulation spaces.
  Verified working from this location.
- `node overlay.mjs <file.json> <out.png>` — renders the room polygons over the reference floor
  plan and writes a PNG. **This is the real acceptance test** — the coverage number is misleading
  on an L-shaped plan, but the overlay shows gaps immediately.
  Requires `playwright` (already a dependency) and the source image at
  `C:\Users\Singh\Downloads\DC floor plan.jpg`; update that path in the script if the image moves.

Acceptance criteria:
1. Overlay of a processed fixture shows no white gaps *between* rooms (gaps outside the apartment
   outline are expected and fine).
2. `remainingGapAreaSqFt` < 2 on all four fixtures.
3. `isolatedRooms` is empty on all four fixtures.
4. No room's area changes by more than ~10% (snapping should nudge edges, not redraw rooms).
5. `npm run build` clean; existing walk/place behaviour unchanged.

## Cost

Zero per trace. This runs on data already paid for. It should also make it safe to keep
`FLOOR_PLAN_EFFORT=low` (~$0.10/trace) permanently, since effort was shown not to affect coverage.

## Unrelated open bug (also for the next session)

**Product import response never reaches the browser.** `POST /api/product-from-url` works end to
end — verified against a live IKEA URL, returning `IKEA KIVIK 3-Seat Sofa, 89.75 × 37.375 ×
32.625in, dimensionsFound: true` plus a 610KB product photo for ~$0.06. The server logs success,
but the response does not come back through Vite's dev proxy, so the UI button stays stuck on
"Reading the page…".

Already tried and did **not** fix it: adding `timeout` / `proxyTimeout` (10 min) to the `/api`
proxy in `vite.config.ts`.

Next thing to try: have `importProductFromUrl()` in `src/lib/floorPlanAi.ts` call
`http://localhost:8787/api/product-from-url` directly instead of the relative `/api/...` path,
bypassing the proxy entirely. CORS is already enabled server-side (`app.use(cors())`), so this
should just work; make the base URL configurable so production isn't hardcoded to localhost.

Also worth noting: Amazon blocks the import even with a real headless browser (returns 404 to
automated access). IKEA works. Plain `fetch` fails everywhere — Amazon 404, Wayfair 429, IKEA
serves a generic shell — which is why the endpoint drives Playwright.

## Out of scope

- Changing the prompt again. It has plateaued; see the table above.
- Changing model or effort. Opus 5 / `low` is the verified sweet spot for *room detection*
  (see `.env.example` for that benchmark). This spec is only about tiling the output.
