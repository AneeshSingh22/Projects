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
