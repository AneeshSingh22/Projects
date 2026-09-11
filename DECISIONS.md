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

**This tradeoff bit immediately.** Phases 1 through 4 were all committed locally
and none of them were ever synced, so the live site served the Phase 0 build for
days while four phases of work sat on one machine. It surfaced only when the app
was opened on a phone and appeared broken.

The lesson is that a manual step at the end of a long task is a step that gets
skipped. The fix is to treat syncing as part of finishing a phase rather than as
a separate chore: nothing counts as done until it is live, because the whole
point of deploying is that the app is usable from a phone outside a restaurant.

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

---

## Phase 3 — Logging a visit

### What got built

Tapping a pin slides up a panel from the bottom of the screen. It shows the
place, its average rating as a large numeral, and every visit logged there.
From it you can log a new visit, edit an old one, delete one, or remove the
place entirely.

The panel drags between three heights: a peek showing just the name and score,
a half height, and nearly full screen for the whole history. The map stays
visible and usable behind it the entire time. It is a sheet, not a dialog.

### The rating colours were changed from the plan

The plan specified a scale running pale, through ochre, to a dark chili red,
with red as the highest rating. Themed on the way food browns.

It was replaced with muted grey, through amber, to green.

The reason is what the map is actually for. Red is the loudest colour
available, and the original scale spent it on places that were merely good,
while a bad place and a great one both read as broadly warm. When the map is
being scanned for somewhere to eat, that is backwards. Now a poor rating
recedes into grey and stays quiet, and the best places are the only strongly
saturated things on screen.

The greens are deliberately deep and slightly dulled rather than a bright
signal green, because maps are already full of green for parks, and pins must
not be mistaken for landmarks.

What was kept from the plan: one continuous scale rather than a handful of
fixed brackets, so a 7.5 sits visibly between a 7 and an 8, and the scale
remains the loudest thing in the app.

### A bug worth recording

Pins were originally coloured by whether a place had been visited, not by how
good it was. So a restaurant rated 0.5 and one rated 10 looked identical. The
colour scale existed but carried no information.

Fixed by working out each place's average rating when the map loads and
colouring from that. Pins now also show the number itself, so the map can be
read without opening anything.

The general lesson: the scale was correct and tested in isolation, and the
component that used it simply never passed it the rating. Testing the piece is
not the same as testing that it is wired up.

### The panel froze the rest of the app

On first build, opening the panel made everything else unresponsive. The map
would not drag, search could not be reached, and there was no way back out.

The panel library was told not to behave as a dialog, but that setting alone
does not stop it covering the screen with an invisible layer that absorbs every
tap. The layer had to be disabled explicitly.

An explicit close button was added at the same time. Dragging the panel down to
dismiss it works, but there is nothing on screen that suggests it, and on a
computer there is no equivalent gesture at all.

### Deleting a place asks a specific question

The database is set up so that removing a place also removes its visits, and
removing a visit also removes its photos. That is deliberate - a visit
belonging to a restaurant that no longer exists would be worse.

But it means deleting a pin can destroy years of notes. So the confirmation
says exactly what will be lost, naming the number of visits, rather than asking
a generic "are you sure?". The plan's whole argument is that the visit history
is the point of the app, and a vague prompt would not respect that.

### Other decisions

**The rating slider is a standard browser control**, not a custom one. It gets
keyboard support, screen-reader support and the phone's own drag feel for free.
The coloured track is the only part that is bespoke.

**The one animation in the app** is the big rating number counting up when the
panel opens. It is skipped entirely, not merely shortened, for anyone whose
system asks for reduced motion.

**Logging a visit only promotes a place from "want to try" to "visited".** If
somewhere had been deliberately marked a favourite, or as somewhere to avoid,
logging a meal will not quietly undo that.

**Visits are never overwritten.** Four meals is four records.

---

## Phase 5 — Natural language logging

### What got built

A text box that reads a sentence like "great tonkotsu at Daikaya with Sarah,
8.5, would go back, about $22" and fills in the visit form from it. You review
what it filled in and save it yourself.

### The rule that shaped everything here

The plan is emphatic that the language model is an accelerator and never a
dependency. In practice that meant deciding, before writing any of it, what
happens when it fails - because it will.

Nothing is ever saved automatically. "Type it myself" is always one tap away.
And every failure - the service being down, rate limited, slow, or returning
nonsense - lands you in exactly the same empty form you would have had without
it, plus a one-line note. Whatever you typed is carried into the notes field so
nothing is thrown away.

The request also gives up after twelve seconds. An app that hangs waiting on a
service it does not need is worse than one that never had the feature.

This is not theoretical caution. While testing, one of the newer models
returned "this model is currently experiencing high demand" - the exact failure
the fallback exists for, encountered within minutes of writing it.

### Model choice

The plan named "Gemini 3 Flash". The key does offer a model by that name, but
it is marked preview, and preview models get withdrawn. A stable alias that
always points at the current version was used instead, after checking it
produced identical output on the plan's own example sentence.

Small call, but the app is meant to still work in five years, and a hard
reference to a preview model is a thing that breaks quietly.

### A bug found on the way

Requests to the app's own interfaces were being redirected to the login page
when signed out, rather than refused. Because an automatic redirect is followed
invisibly, the caller received a login page with a success status and then
failed trying to read it as data - an error reported a long way from its actual
cause. Those requests are now refused properly.

---

## Phase 6 — Installable app, offline, and accessibility

### What got built

The app can be installed to a phone home screen and opens without browser
chrome. It works in airplane mode for reading. Keyboard navigation shows focus
clearly, and the app respects a system request for reduced motion.

### What works offline, and what does not

Places and visits are readable offline. Photos are not.

Photos are served through links that expire after an hour, so a stored link is
worthless by the time you would need it. Caching the images themselves would
work, but it is a real amount of extra machinery for something rarely wanted on
a plane. If that changes, it is a self-contained addition.

The app says which mode it is in rather than letting saves fail silently, since
the difference between "readable" and "writable" is otherwise invisible until
something does not work.

### The offline code was written by hand

Roughly eighty lines, deliberately not generated by a tool. It is the only
thing standing between the app and a blank screen with no connection, and
mistakes in this specific area produce stale code that survives refreshing -
one of the more confusing problems to diagnose. It was worth being able to read
the whole thing.

Sign-in and sign-out are never cached. A cached sign-out is a security problem,
not a speed improvement.

### The contrast check earned its place

The plan asked for a contrast check on the rating colours. Rather than eyeball
it, the actual ratios were calculated.

It caught a real problem. The top of the scale - a 10, the best possible rating
- was the least readable colour on it. It cleared the bar for the very large
numeral but failed at the smaller size used in the visit list. Exactly
backwards from what you would want.

The greens were lightened until every rating passes at both sizes. This is the
kind of thing that is invisible until someone cannot read it, and impossible to
argue about once measured.

### A bug that would have prevented installation entirely

Browsers fetch an app's installation details and its offline code *without
sign-in credentials*. The app's login guard was therefore redirecting both to
the login page.

The symptom would have been the app simply refusing to install, with no error
message anywhere - the browser asks, receives a redirect, and gives up quietly.
Found only by checking that those two files were actually served rather than
assuming they were.
