# Decisions

One entry per build phase. Written to be read on its own, without the code open.

---

## Phase 0 — Skeleton, auth, and the pipeline

### What got built

A Next.js app that does exactly one thing: you enter your email, Supabase emails
you a six-digit code, you type it in, and you land on a page that says you are
signed in. Every other route is closed to anyone not signed in.

Alongside it, a `supabase/schema.sql` file holding the full database design —
places, visits, photos, and the security rules that keep them private. It has not
been run yet; that is a step you take in the Supabase dashboard.

The point of this phase is not the features. It is proving the whole pipeline —
browser, server, database, auth, deploy — connects end to end before anything is
built on top of it.

### The decisions worth explaining

**We sign in with a six-digit code, not a magic link.**

The original plan said magic link: click a link in your email, you are in. That
breaks in one specific place that matters here. Once this app is installed to an
iPhone home screen, it gets its own private storage, separate from Safari.
Tapping a magic link opens Safari, so the sign-in lands in Safari — and the
installed app still shows you logged out, with no obvious reason why.

A typed code has no such problem, because you type it into whatever you are
already looking at. Same Supabase call underneath either way; the difference is
purely which one the email contains. The cost is one extra field to fill in. The
benefit is that the thing does not mysteriously break in Phase 6, which is the
phase where you would have discovered it.

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
- **Magic-link sign-in** — see above; breaks once installed on a phone.
- **Pinning Next.js 15** — a migration owed later for no benefit now.
- **Reading the session from the cookie without verifying it** — faster, but the
  guard is load-bearing and being fast is not the point.
- **A `GET` sign-out link** — any image tag pointing at that URL would log you
  out. Sign-out is a form submission instead.

### Gotchas for later

- **`proxy.ts` runs on almost every request, and each run calls Supabase.** If
  pages ever feel slow, look here first. It deliberately skips images and fonts.
- **The sign-in email must contain `{{ .Token }}`.** That template setting in the
  Supabase dashboard is what makes the email carry a code. Without it the email
  arrives with only a link and the code box has nothing to accept. This is a
  dashboard setting, not code — it will not travel with the repo, and it will
  need setting again on any new Supabase project.
- **Supabase's built-in email sender is rate-limited to a handful per hour.** If
  codes stop arriving while you are testing repeatedly, that is the limit, not a
  bug.
- **`SUPABASE_SERVICE_ROLE_KEY` is not used by any code yet.** It bypasses every
  security rule in the database. Nothing in the app needs it, and that should stay
  true unless there is a specific reason.
- **The environment file is fussy about spaces.** A space after the `=` broke the
  setup tooling once already.

### Toolchain note

npm was two major versions behind what this Node install expects, which caused
package downloads to fail outright. Upgrading fixed it. If installs start failing
strangely again, check the npm version first.

### Still outstanding at the end of this phase

- The schema has not been run against the database yet.
- No GitHub repo and no Vercel deploy, so the acceptance test — open the URL on
  your phone and sign in — has been met locally but not in production.
