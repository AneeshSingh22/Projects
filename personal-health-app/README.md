# Personal Dashboard

A set of small, self-contained HTML apps that share a top bar — gym, health,
finances, caffeine, and a daily checklist, each storing its own state locally
with optional Supabase sync across devices.

## Credit

Started from Rowan Thistlebrooke's [YTdashh1](https://github.com/RowanThistlebrooke/YTdashh1)
dashboard template. Since then I've added the AI mentor, the checklist page,
the Apple Health import pipeline, a shared dark theme, and rebuilt the gym
tracker around real workout sessions.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAneeshSingh22%2FProjects%2Ftree%2Fmain%2Fpersonal-health-app)

One click → Vercel signs you in, copies the repo to your GitHub, and deploys it. ~30 seconds to a live URL.

## How to use

Open any `.html` file directly in your browser — no build step, no install.

| File | What it is |
|---|---|
| [index.html](index.html) | Goals tracker (Day Ring, Goal Ticker, To Do list) — the home page |
| [health.html](health.html) | Supplement / daily stack tracker |
| [finance.html](finance.html) | Finances |
| [gym.html](gym.html) | Progressive overload gym tracker, logged as whole sessions |
| [checklist.html](checklist.html) | One daily checklist pulling from every other page |
| [caffeine.html](caffeine.html) | Caffeine intake tracker |
| [ai-mentor.html](ai-mentor.html) | Swappable AI mentor — runs a free local model by default |
| [topbar.js](topbar.js) | Shared top bar — auto-injected into pages that `<script src="topbar.js">` |
| [theme.css](theme.css) | Shared dark theme tokens |
| [api/health-import.js](api/health-import.js) | Serverless endpoint that ingests Apple Health exports into Supabase |

Each app stores its own state in browser `localStorage`. No accounts, no server.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
