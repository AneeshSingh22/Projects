# Decisions

One entry per build phase. Written to be read on its own, without the code open.

---

## Phase 0 — Skeleton, auth, and the pipeline

### What got built

A Next.js app that does exactly one thing: you enter your email and password and
land on a page that says you are signed in. Every other route is closed to anyone
not signed in.

Alongside it, a `supabase/schema.sql` file holding the full database design —
places, visits, photos, and the security rules that keep them private. It has not
been run yet; that is a step you take in the Supabase dashboard.

The point of this phase is not the features. It is proving the whole pipeline —
browser, server, database, auth, deploy — connects end to end before anything is
built on top of it.

### The decisions worth explaining

**We sign in with a password. This reverses the plan, twice.**

The plan said magic link. We first changed that to an emailed six-digit code,
then abandoned email entirely. Both changes were forced by things only visible
once we tried them, and the reasoning is worth keeping.

*Why not a magic link.* Once this app is installed to an iPhone home screen it
gets its own private storage, separate from Safari. Tapping a magic link opens
Safari, so the sign-in lands in Safari — and the installed app still shows you
logged out, with no visible reason why. That is a bug you would hit in the final
phase, having built everything on top of it.

*Why not an emailed code.* A code is typed into whatever app you are already
looking at, so it dodges the problem above. But Supabase will not put a code in
the email unless you edit the email template, and it will not let you edit the
template unless you configure your own outbound mail server. On top of that, the
built-in sender is capped at a few messages an hour, which we hit while testing.
Free mail providers exist, so this was solvable — but only by adding a permanent
third-party account to a project whose whole point is costing nothing and having
few moving parts.

*Why a password works.* No email is sent at any point, so none of the above
applies: no mail server, no templates, no rate limits, no third-party account,
and the iPhone problem disappears because nothing ever leaves the app. A password
manager fills it, so in daily use it is faster than waiting for an email. The
plan's original argument for magic links was "no password to manage" — true, but
the actual price turned out to be a hard dependency on email delivery, and that
is the worse thing to own.

*Why there is no sign-up page.* The single account is created by hand in the
Supabase dashboard. A sign-up form on a public address would let strangers create
accounts against this project's quota. They could not see any of your data — the
security rules prevent that — but they would still be consuming a free tier sized
for one person. With exactly one user forever, an account created out-of-band
removes the question at no cost.

**We are on Next.js 16, not Next.js 15 as the plan said.**

The scaffolding tool now produces 16 by default. Since nothing exists to migrate
and both libraries the app depends on most — the Google Maps wrapper and the
bottom-sheet library — already support it, starting a version behind would have
meant owing a migration for no gain. The plan has been amended to match.

**The file that guards protected routes is called `proxy.ts`, not `middleware.ts`.**

Next 16 renamed this. Every Supabase tutorial still shows the old name, so this
is a place where following an online guide would produce a file the framework
silently ignores — with the visible symptom being that protected pages are not
actually protected. Worth remembering if something ever looks unguarded.

**Every request revalidates the session against Supabase rather than trusting
the cookie.**

There are two ways to ask "who is signed in". The cheap one reads the browser
cookie and believes it. The one used here checks with Supabase's servers. The
cheap one can be fooled by an edited cookie. Since this guard is the only thing
standing between the internet and your data, it uses the checked version.

**We use Supabase's newer key format, not the legacy one.**

Supabase currently issues two generations of keys. Both work today; the older
JWT-style ones are on the way out and cannot be rotated without downtime. Using
the new ones now avoids a forced migration later.

### Changes made to the plan's database design

The schema in the plan was sound but incomplete in three ways, all fixed:

- **`updated_at` never updated.** It was set when a row was created and then left
  alone forever, making it an exact copy of `created_at`. It now updates on every
  edit, automatically, in the database rather than in app code — so it stays
  correct no matter what writes the row.
- **The photo storage rules existed only as a sentence.** They are now real
  policy, enforced by the database: a photo can only be written to a folder named
  after your own user ID. An upload aimed anywhere else is rejected outright.
- **An unnecessary extension.** The plan installed an add-on to generate unique
  IDs. Modern Postgres does that natively, so the add-on is gone.

The file is also safe to run more than once, which matters because you will
almost certainly run it, notice something, and run it again.

### What was rejected

- **Legacy Supabase JWT keys** — being retired, and cannot be rotated cleanly.
- **Magic-link sign-in** — breaks once installed on a phone.
- **Emailed six-digit codes** — needs a paid-tier mail server to edit the
  template, plus a third-party mail account to maintain forever.
- **A sign-up form** — nothing needs one, and it would expose the quota.
- **Pinning Next.js 15** — a migration owed later for no benefit now.
- **Reading the session from the cookie without verifying it** — faster, but the
  guard is load-bearing and being fast is not the point.
- **A `GET` sign-out link** — any image tag pointing at that URL would log you
  out. Sign-out is a form submission instead.

### Gotchas for later

- **`proxy.ts` runs on almost every request, and each run calls Supabase.** If
  pages ever feel slow, look here first. It deliberately skips images and fonts.
- **The account exists only in the Supabase dashboard.** It is not in the repo
  and not in any migration. On a new Supabase project, no one can sign in until
  a user is created by hand with auto-confirm enabled. Worth writing down
  wherever you keep the password.
- **Email sign-up should stay disabled in the dashboard.** If it is ever switched
  on, the public URL becomes an open registration form.
- **`SUPABASE_SERVICE_ROLE_KEY` is not used by any code yet.** It bypasses every
  security rule in the database. Nothing in the app needs it, and that should stay
  true unless there is a specific reason.
- **The environment file is fussy about spaces.** A space after the `=` broke the
  setup tooling once already.

### Toolchain note

npm was two major versions behind what this Node install expects, which caused
package downloads to fail outright. Upgrading fixed it. If installs start failing
strangely again, check the npm version first.

### Phase 0 acceptance: met

Live at https://plate-restaurant-tracker.vercel.app — signed in on an iPhone,
launched from a home-screen icon. That last detail is the one worth noting: it is
exactly the scenario that would have failed with a magic link, so the password
decision was validated by the acceptance test rather than only argued for.

Verified rather than assumed, before declaring the phase done:

- All three tables exist (queried directly with the secret key).
- The `visit-photos` bucket exists and is private.
- Security rules genuinely deny. An anonymous insert was rejected with
  `42501 new row violates row-level security policy`. Reading an empty table
  proves nothing, so the check was a write.
- No credentials in any commit. Every commit and blob was scanned for key
  patterns before the first public push.

### One deliberate gap

The Maps API key is restricted to `localhost:3000` and the production domain
only. Preview deployments will not render a map.

Google will not accept a wildcard in the middle of a hostname, so covering
previews meant allowing `https://*.vercel.app/*` — every site on vercel.app,
not just ours. That was judged not worth it. A `NEXT_PUBLIC_` key ships in the
browser bundle and is readable by anyone regardless, and the Referer header is
trivially forged, so the referrer list was never the real protection. The daily
quota caps are. Worst case from a leaked key is an exhausted daily quota, not a
bill.

If a preview ever needs a working map, the fix is to add that preview's exact
URL rather than to widen the pattern.

### How this repo reaches GitHub

The code lives on GitHub inside `AneeshSingh22/Projects`, in the
`plate-restaurant-tracker/` subfolder, rather than in a repo of its own. That is
a portfolio repo holding ten other projects.

Because of that, this working folder is a **standalone git repo that is not a
clone of Projects**. Committing here does not push anywhere. Publishing is a
separate step, done by running `./sync-to-github.sh`, which grafts the commits
into the subfolder of a second checkout kept at `c:/Users/Singh/projects/Projects`
and pushes that.

This uses git's subtree support, so the individual phase commits survive into the
portfolio repo's history instead of being flattened into one lump. That matters
because the commit history is meant to be readable as the build story.

The tradeoff accepted here: two checkouts and one extra command per phase, in
exchange for the project sitting where the other work sits. A standalone repo
would have made this a plain `git push`.

---

## Phase 1 — The map, mounted once

### What got built

A full-screen Google map, centred on Shaw, DC, with the app's own header
floating on top of it. That is all you can see. The work in this phase is almost
entirely about a rule that is invisible when it is working.

### The rule this phase exists to enforce

Google charges per map *initialisation*, not per page view or per pan. A React
component that rebuilds the map every time something changes on screen can fire
thousands of billable loads in one afternoon of clicking around. The free
allowance is 10,000 a month. This is the single realistic way this project ever
generates a bill.

So the map is created once when the app opens and is never rebuilt. Everything
else — the search bar coming in next phase, the sliding sheet after that — is
layered *beside* it rather than wrapped *around* it. Anything that wraps the map
can rebuild it; anything beside it cannot. That is the whole architecture, and it
is why the page is structured the way it is even though it currently holds almost
nothing.

### The counter that proves it

There is a counter in the code, visible only during development, that prints
`[MAP MOUNT] count = 1` to the browser console. If it ever prints 2, something
has started rebuilding the map and it needs fixing before anything else.

**This was rewritten rather than taken from the plan.** The original counted how
many times a React component appeared. That number is wrong in two ordinary
situations: React deliberately runs setup twice during development as a
correctness check, so it read 2 immediately on a fresh load; and it remembered
its count across page refreshes, so refreshing showed 2, then 3, then 4 — even
though each refresh is legitimately one new map.

Both of those are false alarms, and a warning that fires when nothing is wrong
gets ignored within a day. At that point it is worse than having no warning,
because it creates the impression of a safety net that is not there.

What costs money is how many maps get built, so that is what is counted now, by
tracking the map objects themselves rather than the React components around them.
Development-mode double-runs and moving between pages correctly report 1. A real
rebuild reports 2 and prints a loud error naming the likely causes. A full page
refresh goes back to 1, which is correct, because a refresh genuinely is one new
map.

### Other decisions

**Design tokens moved to CSS.** The plan put the colour palette in a Tailwind
config file. Tailwind version 4, which this project uses, no longer has that
file. Same palette, different location.

**Two fonts, loaded at build time rather than fetched from Google.** Both are
downloaded and bundled during the build, so the app makes no request to Google
Fonts when someone opens it. Fraunces is loaded with its optical-size axis
available, which matters for the oversized rating numeral in Phase 3 — type
designed for large display sizes is drawn differently from type meant for body
text, and using the wrong cut at 56px looks subtly clumsy.

**The map ignores React for panning.** The map is told where to start, not where
to be. Continuously telling it where to be would turn every drag into a
re-render and fight the user's own gestures.

### Known incomplete

**The map style is not applied.** The plan calls for a dark, desaturated map with
only restaurant labels showing. That style is configured in the Google Cloud
console against the Map ID, not in this codebase, and it has not taken effect
yet. The map currently renders in default Google colours.

This is cosmetic and deliberately deferred. It changes no code, needs no rebuild,
and can be applied at any time. Worth knowing: the palette in the plan was chosen
against a dark map, so if the map stays light, the rating colours will need
deepening to stay legible. That is a Phase 3 concern.

---

## Phase 2 — Search, add, and pins

### What got built

Three ways to get a restaurant onto the map: search for it by name, tap a
restaurant label Google already draws on the map, or long-press an empty spot
and name it yourself. Everything added shows as a pin, and the pins come from
your own database rather than from Google.

### The cost rules this phase had to obey

This is the phase where the app starts talking to Google's paid APIs, so the
money constraint stops being theoretical.

**Searching is billed by session, not by keystroke.** Type "daikaya" and that is
seven requests. Google's pricing forgives all of them *if* they carry a shared
session token and the session is closed by looking up the place you picked. Then
you pay for one lookup instead of seven searches.

The trap is that a token is single-use. Reuse one after its session closed and
billing silently reverts to per-keystroke — silently, with no error and no
warning, the invoice just changes. Because the failure is invisible, the token
lifecycle lives in one small file of its own rather than being spread through
the interface code, so it can be checked in one place.

Searching is also delayed by a quarter second after you stop typing, so a
five-letter word is one request rather than five.

**Only cheap fields are ever requested.** Google splits place data into tiers.
Name, address, coordinates and category are the cheap tier, with an allowance
roughly ten times the expensive one. Photos, reviews and ratings are the
expensive tier. The code requests the cheap set explicitly and never the
expensive one. This was tested against the live API rather than assumed.

**Once a place is saved, Google is never asked about it again.** The map draws
entirely from your own database. Adding somewhere already on your map returns
what is already there instead of asking Google a second time.

**No "search this area" button, ever.** That feature would call the most
expensive endpoint on every map pan. The plan forbids it and so does this. The
restaurant names already visible on the base map are free, because they are
painted into the map images rather than fetched.

### The thing that surprised me

The plan described using Google's ready-made search box. That component was
retired in March 2025, and the newer API this project is set up for does not
offer it at all. The replacement is assembled by hand from two separate calls.

Practical consequence: almost every tutorial and code sample online shows the
retired approach. If this code ever needs changing and something found online
looks much simpler, that is probably why — and it will not work against this
project's setup.

### Loading every place at once

The plan called for asking the database only for places inside the current map
view, refreshed as you pan. That was dropped in favour of loading everything
once when the app opens.

One person's restaurant list is a rounded-up tenth of a megabyte. Loading it
once removes a network request from every pan, removes a whole class of bug
where a fast pan lands results out of order, and means the offline support in a
later phase is nearly free because the data is already there.

The database still carries the indexes the original approach would have needed,
so switching back later is a small change. The real limit is not the loading but
how many pins a map can draw smoothly, which is somewhere in the thousands.

### A bug worth remembering

The long-press feature was first written by hand, using a timer to detect a
held finger and some arithmetic to turn the touch position into a location.
Both halves were wrong. React clears the event details before a timer fires, so
it would never have triggered. And converting a screen position into a
coordinate by simple proportion is inaccurate on a map, because map projections
stretch north-south — close enough when zoomed into one street, badly wrong when
zoomed out.

Both problems disappeared by using the map's own built-in event, which reports
the exact location directly. Worth remembering as a general lesson: the
hand-rolled version was more code, and wrong in ways that would not have shown
up until someone used it far from where it was tested.

### Verified

- Search found the intended restaurant through the new API.
- A place lookup returned name, address, coordinates, category, city and
  country, with no expensive-tier fields present.
- A place saved and reloaded correctly.
- The automatic "last modified" timestamp genuinely updates on edit — confirmed
  by editing a live row and watching it change.
- The map still initialises exactly once after adding search, selection, dialogs
  and a growing set of pins. This is the check that matters most, and it was
  confirmed by hand in the browser.
