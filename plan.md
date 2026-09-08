# Plate — Personal Restaurant Map

A build plan. Read the whole document before writing any code.

---

## 0. How to work on this project

You are building this with the repo owner (Aneesh), who will be explaining this project on
technical calls. That changes how you should work:

**Stop at the end of every phase.** Do not run ahead. Each phase has acceptance criteria.
Build it, tell him how to verify it, and wait for him to confirm before starting the next one.

**Write to `DECISIONS.md` after every phase.** Append an entry with:

- What you built in this phase, in plain language
- Why you chose that approach
- What alternatives you rejected, and why
- Any gotcha he'd need to know if something breaks later

Write it so someone who has not read the code can understand it. This file is the thing he
will read before an interview. Do not write it as code comments and do not assume he
remembers the previous phase.

**Explain as you go.** When you make a non-obvious decision mid-phase — a library choice, a
data-shape call, a workaround — say so in chat and say why. Terse is fine. Silent is not.

**Ask before adding dependencies.** Every package is something he has to be able to explain.

---

## 1. What this is

A private, single-user web app that renders a map of every restaurant he has been to or
wants to try. Tapping a pin shows his history at that place: rating, notes, photos, dates.
Logging a new visit takes seconds.

It has to work well on a phone, because that is where it gets used — standing outside a
restaurant that just ended. It also has to still be useful in five years, which means the
data model matters more than the features.

**Primary jobs, in order:**

1. Log a visit in under 15 seconds
2. Remember what he thought of a place he went to two years ago
3. Answer "what did I want to try around here?" while standing somewhere

**Explicitly not:** a social app, a review site, a recommendation engine, or a replacement
for Google Maps.

---

## 2. Non-negotiable constraints

These are the two ways this project fails. Treat them as hard requirements, not preferences.

### 2.1 It must cost $0/month

Google Maps Platform has per-SKU monthly free caps. Single-user traffic sits at well under
1% of them. The only way to get billed is a bug that loops API calls. Section 6 covers the
guardrails. Do not skip them, and do not add a feature that makes per-viewport Places API
calls.

### 2.2 The map must initialize exactly once per session

Repeated map initialization is the specific bug that turns a free app into a bill. Section 5
covers the architecture that prevents it. There is a mount counter in the acceptance criteria
for Phase 1 — it must read `1` after five minutes of clicking around.

---

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | Typed schema catches errors early |
| Styling | Tailwind CSS | Fast, and pairs with shadcn |
| Components | shadcn/ui | Copies source into the repo — no black-box dependency |
| Map | `@vis.gl/react-google-maps` | `APIProvider` loads the Maps script once. Do not hand-roll a loader. |
| Database | Supabase Postgres | Also gives auth and storage in one service |
| Auth | Supabase Auth, magic link | Single user, no password to manage |
| Photos | Supabase Storage | 1GB free tier |
| LLM | Gemini 3 Flash via Google AI Studio | Free tier, no credit card, ~1,500 requests/day |
| Hosting | Vercel | Free tier |

Two Google projects, kept separate:

- **Maps project** — billing enabled (Google requires it even for free-tier use)
- **AI Studio project** — no billing, so the Gemini free tier stays intact

Do not put both keys in one project.

---

## 4. Setup Aneesh does before Phase 0

Walk him through these. Do not proceed until they're done.

### 4.1 Google Cloud (Maps)

1. Create a project named `plate-maps`
2. Enable **Maps JavaScript API** and **Places API (New)**
3. Create an API key, restrict it to those two APIs
4. Add an HTTP referrer restriction: `localhost:3000/*` and the Vercel domain
5. **Set quota caps** — APIs & Services → Quotas. Cap each SKU at **100 requests/day**.
   This is the single most important step in this document.
6. Billing → Budgets → alert at **$1**
7. Create a **Map ID** (Google Maps Platform → Map Management), type "JavaScript", vector.
   Required for both custom styling and advanced markers.

### 4.2 Google AI Studio (Gemini)

1. Go to AI Studio, create an API key in a **new, separate** project
2. Do not enable billing on it

### 4.3 Supabase

1. New project, note the URL, anon key, and service role key
2. Storage → create a bucket named `visit-photos`, set to private

### 4.4 Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
GEMINI_API_KEY=
```

`GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. They must never appear in
client code or in a `NEXT_PUBLIC_` variable.

---

## 5. Map architecture — the mount rule

### The failure mode

Google bills per map *load*, meaning per initialization. A React component that remounts the
map on every state change can fire thousands of loads in one browsing session. Free tier is
10,000 loads/month. A single afternoon of debugging with a remount bug can burn it.

### The three rules

**Rule 1: `APIProvider` lives in the root layout and never unmounts.**

```tsx
// app/layout.tsx
<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
  {children}
</APIProvider>
```

The Maps script is fetched once per session. Nothing below it may load the script again.

**Rule 2: `<Map>` is mounted once and never conditionally rendered.**

Forbidden patterns:

```tsx
{isSheetOpen && <Map ... />}        // conditional render — remounts
<Map key={selectedPlaceId} ... />   // changing key — remounts
{loading ? <Spinner/> : <Map/>}     // swap — remounts
```

Correct pattern: the map is always in the tree. Overlays render as siblings on top of it, not
as parents or wrappers. Selected-place state lives in a component *beside* the map, never in a
component that wraps it.

```tsx
<div className="relative h-dvh">
  <Map ... />                    {/* always mounted, never conditional */}
  <SearchPill />                 {/* sibling, absolutely positioned */}
  <BottomSheet place={selected} />  {/* sibling — may unmount freely */}
</div>
```

**Rule 3: markers are data-driven children.**

Render `<AdvancedMarker>` from an array. Adding, removing, or recoloring markers must never
touch the map instance itself.

### The canary

Add a dev-only mount counter:

```tsx
// components/MapMountCounter.tsx — dev only
useEffect(() => {
  const n = Number(sessionStorage.getItem('map-mounts') ?? 0) + 1;
  sessionStorage.setItem('map-mounts', String(n));
  console.warn(`[MAP MOUNT] count = ${n}`);
  if (n > 1) console.error('MAP REMOUNTED — this costs money. Fix before continuing.');
}, []);
```

This stays in the codebase permanently, gated behind `NODE_ENV === 'development'`.

---

## 6. Cost architecture

### What is free and unlimited

- Panning, zooming, dragging — no calls
- Restaurant names on the base map — baked into the tile images, not API calls
- Rendering your own pins — they come from Postgres, Google never sees them
- Opening the bottom sheet, browsing photos, editing notes

### What consumes quota, and its cap

| Action | SKU | Free/month | Expected use |
|---|---|---|---|
| Page load | Maps JavaScript | 10,000 | ~30 |
| Searching a new restaurant | Autocomplete Session | 5,000 | ~5 |
| Confirming a new restaurant | Place Details Essentials | 10,000 | ~5 |
| Tapping a map POI | Place Details Essentials | 10,000 | ~10 |

### Rules

**Use session tokens on autocomplete.** Generate a token when the search field focuses, pass
it on every autocomplete request, and pass it on the closing Place Details call. When a session
terminates on a Place Details call, the autocomplete requests inside it bill at $0. Generate a
fresh token after each completed search.

**Use field masks.** Request only:

```
id, displayName, formattedAddress, location, types, primaryType
```

Never request `photos`, `reviews`, `rating`, or `editorialSummary`. Those push the request into
the Enterprise SKU, which has a 1,000/month cap and is the one realistic way to get billed.

**Cache write-once.** Once a place is in the `places` table, never call Google about it again.
The map renders entirely from Postgres. The Google `place_id` is a permanent key and is safe to
store indefinitely; other fields are treated as a snapshot and are not refreshed.

**Never add a "search this area" feature.** Nearby Search and Text Search are $32/1,000 with a
5,000/month cap, and would fire on every pan. The base map already shows restaurant names for
free. If this is ever requested, refuse and reference this section.

---

## 7. Data model

### Design notes

`places` and `visits` are separate tables. A place is a location; a visit is one meal there.
Four visits to the same restaurant means four rows, and the history is the point of the app —
never overwrite a visit.

`status` is stored on the place rather than derived, because "want to try" and "never again"
are states that exist independently of visit count.

**No PostGIS.** Two indexed float columns and a `BETWEEN` bounding-box query handle thousands
of rows fine. The extension adds setup complexity for no benefit at this scale. If the table
ever passes ~50,000 rows, revisit.

### Schema

```sql
create extension if not exists "uuid-ossp";

create type place_status as enum ('want_to_try', 'visited', 'favorite', 'avoid');

create table places (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  google_place_id text,
  name            text not null,
  address         text,
  city            text,
  country         text,
  lat             double precision not null,
  lng             double precision not null,
  status          place_status not null default 'want_to_try',
  cuisine         text,
  price_level     smallint check (price_level between 1 and 4),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, google_place_id)
);

create index places_user_bbox_idx on places (user_id, lat, lng);
create index places_user_status_idx on places (user_id, status);

create table visits (
  id            uuid primary key default uuid_generate_v4(),
  place_id      uuid not null references places(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  visited_on    date not null default current_date,
  rating        numeric(3,1) check (rating between 0 and 10),
  notes         text,
  dishes        text[],
  companions    text[],
  price_paid    numeric(10,2),
  would_return  boolean,
  occasion      text,
  created_at    timestamptz not null default now()
);

create index visits_place_idx on visits (place_id, visited_on desc);
create index visits_user_date_idx on visits (user_id, visited_on desc);

create table photos (
  id           uuid primary key default uuid_generate_v4(),
  visit_id     uuid not null references visits(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  thumb_path   text not null,
  caption      text,
  width        integer,
  height       integer,
  bytes        integer,
  created_at   timestamptz not null default now()
);

create index photos_visit_idx on photos (visit_id);

-- Row level security. Single user today, but enable it now.
alter table places enable row level security;
alter table visits enable row level security;
alter table photos enable row level security;

create policy "own places" on places for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own visits" on visits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own photos" on photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Derived values — average rating, visit count, last visited — are computed in a Postgres view
or in the query layer. Do not denormalize them onto `places` until there is a measured reason.

Storage bucket `visit-photos` gets a policy restricting read and write to
`auth.uid()::text = (storage.foldername(name))[1]`, so paths are `{user_id}/{visit_id}/{uuid}.jpg`.

---

## 8. Design system

The subject is a private notebook of meals, used at night, on a phone, outdoors. It should
feel closer to a well-set menu than to a dashboard. Warm, legible, quiet — with one loud
element.

### Colors

Surfaces are a deep blue-green, not black. Black surfaces under a map read as a dead screen;
the teal cast makes the map feel like dusk in a city.

```css
--ink:            #0E1618;  /* map surround, deepest layer */
--surface:        #172427;  /* bottom sheet, cards */
--surface-raised: #1F3034;  /* inputs, chips */
--line:           #2C4247;  /* hairlines, dividers */
--text:           #EDE8E0;  /* warm off-white — softens the cool base */
--text-dim:       #93A6A9;
```

The rating ramp is the palette's spine, and it runs the way food browns — pale and raw at the
low end, deepening through ochre to a dark chili red at the top. This is the one place the app
is allowed to be loud.

```css
--r-none:  #6E8489;  /* wishlist — rendered as outline only, no fill */
--r-low:   #7E9298;  /* 1–4 */
--r-mid:   #C9973F;  /* 5–6 */
--r-good:  #D2542E;  /* 7–8 */
--r-top:   #A82A28;  /* 9–10 */
```

Interpolate between stops for in-between ratings rather than using five hard buckets — a 7.5
should sit visibly between a 7 and an 8.

### Typography

Two families, clearly distinct.

- **Fraunces** — place names, rating numerals, section headings. It has warmth and weight in
  its numerals, which matters because the rating is the loudest element in the app. Set
  `opsz` high on the large rating display.
- **Geist Sans** — every interface element, form labels, notes, dates. Neutral by design so it
  disappears behind the content.

Scale: 12 / 14 / 16 / 20 / 28 / 56. The 56 is reserved for the rating numeral in the bottom
sheet and appears nowhere else.

Sentence case everywhere. No all-caps labels.

### Layout

Mobile-first. The map is full-bleed behind everything.

```
┌─────────────────────────────┐
│  ( Search a restaurant   ⌕ )│  ← floating pill, 16px inset, blurred backdrop
│                             │
│         ●        ○          │  ← filled = visited, hollow = wishlist
│              ●              │
│      ○            ●         │
│                             │
│                        [+]  │  ← log a visit, bottom-right
│ ╭─────────────────────────╮ │
│ │ ▁▁▁                     │ │  ← bottom sheet, drag handle
│ │ Daikaya            8.5  │ │  ← Fraunces name left, rating right, 56px
│ │ Ramen · Chinatown       │ │
│ │ ▢ ▢ ▢                   │ │  ← photo strip
│ │ 4 visits · last Aug 12  │ │
│ ╰─────────────────────────╯ │
└─────────────────────────────┘
```

Bottom sheet, not modal — the map stays visible. Three detents: peek (name + rating), half
(photos + last visit), full (complete visit history). Drag to move between them.

On desktop, the sheet becomes a left rail at 380px and the map fills the rest. Do not build a
separate desktop layout beyond that.

### Motion

One orchestrated moment: the sheet sliding up on pin tap, with the rating numeral counting up
from 0 to its value over ~400ms. That is the whole motion budget. No card hover transitions, no
fade-and-slide on scroll, and honor `prefers-reduced-motion` by skipping the count-up.

### Empty states

The empty map is an invitation, not an apology: "No places yet. Search for a restaurant, or
tap one on the map to add it." Never a spinner where content will be — use a skeleton in the
sheet's shape.

### Map style

Create the style on the Map ID in the Google Cloud console, not in JS.

- Desaturate roads and landscape to near-monochrome in the teal family
- **Keep** POI "food and drink" labels visible, at low contrast (grey, ~60% opacity)
- **Hide** all other POI categories, transit icons, and business labels
- No 3D buildings, no terrain

The result: Google's restaurant names sit quiet in the background, and his pins are the only
saturated thing on screen.

---

## 9. Build phases

Stop after each. Write the `DECISIONS.md` entry. Wait for confirmation.

### Phase 0 — Skeleton and deploy

Prove the whole pipeline works before building anything on top of it.

- `create-next-app` with TypeScript, Tailwind, App Router
- shadcn/ui init
- Supabase client (browser and server)
- Run the Phase 7 schema against Supabase
- Magic-link auth, one protected route
- Deploy to Vercel with all env vars set

**Acceptance:** he can open the Vercel URL on his phone, log in via email, and see a page that
says he's logged in. Nothing else.

### Phase 1 — The map, mounted once

- `APIProvider` in root layout
- Full-screen `<Map>` with the custom Map ID, centered on Shaw, DC
- The dev mount counter from Section 5
- Design tokens from Section 8 wired into Tailwind config
- Fonts loaded via `next/font`

**Acceptance:** the map renders styled and dark. Restaurant names appear as he pans. After
five minutes of panning, zooming, and navigating around the app, the console shows
`[MAP MOUNT] count = 1` and nothing higher. Verify on mobile.

### Phase 2 — Search, add, and pins

- Floating search pill with Places Autocomplete, session tokens per Section 6
- Selecting a result writes a `places` row with status `want_to_try`
- Map POI click handler: `onClick` on `<Map>` receives a `placeId` for built-in POI labels —
  call `e.stop()` to suppress Google's default info window, then offer "Add to wishlist"
- Long-press drops a custom pin with manual name entry, `google_place_id` null
- Pins render from Postgres: hollow outline for `want_to_try`, filled for everything else
- Viewport-bounded query on lat/lng, debounced 300ms

**Acceptance:** he can search "Daikaya", tap it, and see a hollow pin appear. Reload — pin is
still there. Tap a restaurant label already on the map and add it without typing. Mount counter
still reads 1.

### Phase 3 — Logging a visit

- Bottom sheet with three detents, drag between them
- "Log a visit" form: date, rating 0–10, notes, dishes, companions, price, would-return
- Rating input is a slider with live color feedback along the ramp — the numeral changes color
  as he drags
- Saving a visit flips the place status to `visited` and recolors the pin
- Sheet shows full visit history, newest first
- Edit and delete a visit

**Acceptance:** log a visit at 8.5, watch the pin change color, close the app, reopen it, tap
the pin, see the visit. Log a second visit to the same place and see both.

### Phase 4 — Photos

- Camera capture via `<input type="file" accept="image/*" capture="environment">`
- Client-side compression with `browser-image-compression`: long edge 1600px, quality 0.8,
  target ~300KB
- Generate a 400px thumbnail at ~30KB alongside it
- Upload both to `visit-photos/{user_id}/{visit_id}/`
- Photo strip in the sheet loads thumbnails only; tapping opens the full image
- Show a running storage total somewhere in settings

**Acceptance:** take a photo of food, it uploads in a few seconds, appears in the strip, and
the stored file is under 400KB. Scrolling the map does not download full-size images.

### Phase 5 — Natural language logging

**The LLM is an accelerator, never a dependency.** The manual form from Phase 3 remains fully
functional and is always reachable. Gemini pre-fills that form; it does not replace it.

- One text input: "great tonkotsu at Daikaya with Sarah, 8.5, would go back, about $22"
- Server route (`GEMINI_API_KEY` stays server-side) calls Gemini 3 Flash with a strict JSON
  schema matching the visit fields
- Response pre-fills the Phase 3 form. He reviews and confirms. Never auto-save.
- If the place name doesn't match an existing row, run it through autocomplete as a suggestion
- On API error, rate limit, or malformed JSON: fall back silently to the empty manual form
  with a small note. The app must never block on Gemini.

Free-tier limits are roughly 10 requests/minute and 1,500/day, which is far above single-user
use. Note that free-tier prompts may be used to improve Google's models — fine for restaurant
notes, worth knowing.

**Acceptance:** typing one sentence produces a correctly pre-filled form. Disconnecting the
network or using an invalid API key still lets him log a visit manually.

### Phase 6 — PWA and polish

- Manifest, icons, `display: standalone`, theme color `--ink`
- Service worker caching the app shell and his places data for offline read
- Add-to-home-screen prompt
- Keyboard focus states, `prefers-reduced-motion`, contrast check on the rating ramp against
  `--surface`

**Acceptance:** installs to his iPhone home screen, opens without browser chrome, and shows his
pins in airplane mode.

---

## 10. Known gotchas

**Map ID is required** for both `AdvancedMarker` and cloud-based styling. If markers don't
render, check that it's set and that it's a vector map.

**POI clicks need `e.stop()`.** Without it, Google's own info window opens over your sheet.

**`h-dvh` not `h-screen`** — mobile browser chrome makes `100vh` wrong on iOS.

**Supabase Storage paths must start with the user ID** or the RLS policy in Section 7 rejects
the upload.

**iOS PWA and camera:** the file input with `capture` works. Do not attempt `getUserMedia` —
it behaves differently in standalone mode.

**Autocomplete session tokens are single-use.** Reusing one after a completed Place Details
call silently reverts to per-request billing.

**Next.js `"use client"` and `APIProvider`:** the provider is a client component. Keep the
layout server-side and wrap only the map subtree.

---

## 11. Out of scope

Not now. Do not build these without being asked:

- Sharing, social features, or multi-user
- Natural-language *querying* ("cheap Thai I liked near here") — good idea, later phase
- Google Takeout import of saved places
- Year-in-review generation
- Any per-viewport Places API search

---

## 12. First message back

Before writing code, reply with:

1. Your understanding of the two non-negotiable constraints, in your own words
2. Anything in this plan you think is wrong or would do differently
3. The exact list of things Aneesh needs to do in Section 4, as a checklist

Then wait.
