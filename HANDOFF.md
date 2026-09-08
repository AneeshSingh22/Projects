# HANDOFF — read this together with plan.md before doing anything

This project was set up in a previous Claude Code session in a different folder
(`OneDrive/Documents/Plate-Restaurant-Tracker`) and moved out of OneDrive to avoid
`node_modules` sync problems. **No code has been written yet.**

**State: Phase 0 built (see DECISIONS.md). This file is historical context; DECISIONS.md is now authoritative for what exists.**

~~State: pre-Phase 0.~~ Section 12 of `plan.md` ("First message back") is ALREADY DONE —
do not repeat it. Pick up at section 5 below.

---

## 1. Working agreement (from plan.md §0 — still in force)

- **Stop at the end of every phase.** Build it, say how to verify it, wait for confirmation.
  Do not run ahead into the next phase.
- **Append to `DECISIONS.md` after every phase**: what was built in plain language, why that
  approach, what was rejected and why, gotchas for later. Written for someone who has not
  read the code. Aneesh reads this before technical calls. It does not exist yet — Phase 0
  creates it.
- **Ask before adding any dependency.** Every package is one he has to be able to explain.
- **Explain non-obvious calls in chat as you make them.** Terse is fine, silent is not.
- He has asked to be told about issues and improvements as they come up, and wants to approve
  them before they are acted on.

---

## 2. External setup — DONE

### Google Cloud, project `plate-maps` (billing enabled, budget alert at $1)

- Maps JavaScript API enabled
- **Places API (New)** enabled — `places.googleapis.com`, NOT legacy `places-backend`
- Browser API key created, restricted to those two APIs plus referrer `http://localhost:3000/*`
  - The Vercel domain still needs adding to that referrer list after the first deploy
- Map ID `plate-map` created: type JavaScript, **Vector**, tilt OFF, rotation OFF
  - Tilt/rotation left off deliberately: two-finger gestures collide with pinch-zoom on
    mobile, and §8 calls for a flat map. Reversible in Map ID settings, no rebuild needed.
- **No map style applied yet.** That is a Phase 1 task (plan.md §8 "Map style").

### Quota caps set — this is the §2.1 cost guardrail, do not raise these

Maps JavaScript API:

- Map loads per day = **200**
- Map loads per minute = **20** (if that row was present)

Places API (New) — five unused SKUs zeroed at BOTH the account level and the per-user level:

| Quota | Set to | Why |
|---|---|---|
| `SearchNearbyRequest` | 0 | Nearby Search — the "search this area" feature §6 forbids |
| `SearchTextRequest` | 0 | Text Search — same expensive tier |
| `GetPhotoMediaRequest` | 0 | Google place photos — app uses Supabase Storage instead |
| `SearchMediaRequest` | 0 | Was Unlimited |
| `SearchReviewPostsRequest` | 0 | Was Unlimited |

Places API (New) — the two SKUs the app actually uses:

| Quota | Set to |
|---|---|
| `AutocompletePlacesRequest` | **200/day, 30/min** (per-minute-per-user left Unlimited) |
| `GetPlaceRequest` | **200/day, 30/min** (per-minute-per-user left Unlimited) |

Rationale for 200 rather than plan.md's 100: quota counts raw requests while billing counts
sessions, so the quota needs headroom the billing number does not. Still ~1/25 of free tier.

If code ever needs Text Search or Nearby Search, that is a design error — see plan.md §6.

### Google AI Studio — separate project, billing NOT enabled

Gemini API key created in its own unbilled project, so overspend is structurally impossible.
Worst case is a rate limit, never an invoice.

---

## 3. External setup — OUTSTANDING

**Supabase** — was mid-outage during setup. Still to do:

- Create project `plate`; collect Project URL, anon/publishable key, service_role/secret key
- Create bucket `visit-photos`, **private**
- Auth redirect URLs: Site URL `http://localhost:3000`, redirect `http://localhost:3000/**`
- At the project-creation security dialog: Data API **on**, auto-expose new tables **on**,
  and **automatic RLS on** — that last one is off by default and is worth enabling, since it
  guarantees no future table is ever accidentally world-readable.
- Do NOT run the plan.md §7 SQL verbatim. Phase 0 should supply a version that also includes
  an `updated_at` trigger and the storage bucket policy.

**Vercel** — Phase 0. Nothing to do until there is a repo.

---

## 4. Files that already exist

| File | State |
|---|---|
| `plan.md` | The spec. Authoritative. Read it in full. |
| `.env.local` | Google Maps key, Map ID, and Gemini key **filled in**. Supabase vars blank pending section 3. Gitignored. |
| `.env.example` | Blank-valued, committed, documents the required shape. |
| `.gitignore` | `.env.*` with an `!.env.example` exception, plus standard Next.js entries. |
| `HANDOFF.md` | This file. |

Not yet done: `git init`, `create-next-app`, `DECISIONS.md`.

---

## 5. Outstanding decisions — RAISE THESE FIRST

### 5a. Eight proposed deviations from plan.md (proposed, NOT yet approved)

1. **Load all places once; drop the viewport-bounded query** (Phase 2). A single user's
   `places` table is under 100KB of JSON. Fetch once, filter in memory. Removes a debounce
   race, removes a per-pan network call, and makes Phase 6 offline nearly free. Keep the bbox
   indexes as the migration path. Revisit at ~10k rows.

2. **Rewrite the mount counter** (Phase 1). The §5 version uses `sessionStorage` inside a
   `useEffect`, so React Strict Mode (on by default in Next 15) double-fires it and it reads
   `2` on the first dev load. A canary that cries wolf is worthless. Count actual map
   instances via `useMap()` and track instance identity instead — same console output, same
   permanent placement, immune to Strict Mode.

3. **Use Places API (New) for autocomplete** (Phase 2). `google.maps.places.Autocomplete` is
   the legacy widget, deprecated March 2025. Correct path is
   `AutocompleteSuggestion.fetchAutocompleteSuggestions()` plus `place.fetchFields()`, which
   is also where the Essentials-vs-Enterprise field mask from §6 actually applies. The code
   will look nothing like most tutorials found online.

4. **Magic link breaks in an installed iOS PWA** (Phase 0, bites in Phase 6). The link opens
   in Safari, not the standalone app, so the PWA still shows logged out. Build Phase 0 with
   magic link as specified, but structure the auth callback so swapping to 6-digit OTP entry
   later is a small change rather than a rewrite.

5. **Add an `updated_at` trigger** (Phase 0). The §7 schema defaults it on insert and then
   never touches it again.

6. **Tailwind v4 changes where the design tokens live** (Phase 1). Next 15 ships Tailwind v4,
   which has no `tailwind.config.ts` theme block — tokens go in CSS via `@theme`. §8 says
   "wired into Tailwind config"; same outcome, different file. shadcn supports v4, but older
   shadcn snippets found online assume v3.

7. **Private bucket means signed URLs** (Phase 4/6). Thumbnails need time-limited signed URLs,
   batch-signed per sheet open rather than N round trips. Knock-on: signed URLs expire, so
   Phase 6 offline should cover places and visits data only, with photos online-only, unless
   he wants IndexedDB blob caching.

8. **Quota console names do not match SKU names** — RESOLVED during setup, see section 2. Done.

Checked and correct in plan.md, needing no change: `unique (user_id, google_place_id)`
correctly permits many custom pins, because Postgres treats NULLs as distinct in unique
indexes. Skipping PostGIS is the right call at this scale.

### 5b. Dependencies awaiting approval

| Package | For | Recommendation |
|---|---|---|
| `vaul` | Bottom sheet with 3 drag detents (Phase 3) | **Yes.** Alternative is ~200 lines of hand-rolled pointer math, and it is the app's main interaction. |
| `@google/genai` | Gemini call (Phase 5) | **No.** Plain `fetch` to the REST endpoint — zero deps, slightly more code. |
| `browser-image-compression` | Photo compression (Phase 4) | Already named in plan.md §9. |

### 5c. Also unanswered

- `git init` — not yet run, needs his go-ahead.

---

## 6. Environment and toolchain notes

- Windows 11, PowerShell primary, Git Bash also available.
- Node v26.5.0 — fine for Next 15. npm 10.2.4, older than what Node 26 normally ships, which
  suggests a separately-installed npm earlier on PATH. Harmless unless installs act strangely.
- **`create-next-app` will refuse to scaffold into this folder.** It tolerates only a short
  allowlist of pre-existing files, and `plan.md`, `HANDOFF.md`, and `.env.local` are not on
  it. Move them aside, scaffold, move them back. Expect this; it is not an error.
- Both Google keys start with `AIza...` but come from different projects and are NOT
  interchangeable.

---

## 7. Immediate next steps

1. Confirm the deviations in 5a and the dependency calls in 5b.
2. `git init`.
3. Either wait on Supabase, or start Phase 0 scaffolding and wire Supabase when its keys land.
4. Build Phase 0 per plan.md §9, write the first `DECISIONS.md` entry, and **stop**.
