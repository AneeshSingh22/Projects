# Deploying to Vercel

## One-time setup

1. Push this repo to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repo. Vercel detects Vite and reads
   `vercel.json` — no manual build settings needed.
3. **Do not set `ANTHROPIC_API_KEY`** in Vercel's environment variables. The deployed site is
   deliberately key-less: every visitor supplies their own key, so nobody can spend yours.
4. Deploy. Your link is ready to share.

## What visitors get

**Without any API key** (the default, and what most people will do):
- The **Example Apartment** is already loaded on first visit — a real traced 2-bedroom with walls,
  doors, windows and built-in kitchen/bath fixtures, and no loose furniture, so there's something
  to furnish immediately.
- Full 3D: orbit, top-down, and first-person walk mode.
- Place, move, rotate, recolour and delete furniture; change per-room paint and flooring.
- Trace their own floor plan by hand from an uploaded image.

**With their own Anthropic key** (optional, entered in-app):
- Automatic floor plan reading — rooms, doors, windows and fixtures from a plan image.
- Style matching from room photos.
- Product import from a store URL.

The in-app key panel states the model, the per-action cost, and that a Claude Pro/Max subscription
does *not* include API credit — so nobody is surprised by a bill.

## Privacy / multi-user behaviour

Each visitor's work is stored in **their own browser's IndexedDB**. There is no shared server
database, so:

- Visitor A's furniture is invisible to Visitor B. Everyone gets a clean example apartment.
- Nobody can break the demo for anyone else.
- Work persists for a returning visitor on the same browser, and is lost if they clear site data.
- API keys live in the visitor's `localStorage` and are sent only as a request header, forwarded
  straight to Anthropic and never stored server-side.

## Known limitation: product import on Vercel

`api/product-from-url.js` uses a plain `fetch`, because Vercel functions can't run a headless
browser within normal limits. Measured behaviour:

| Retailer | Plain fetch (Vercel) | Headless browser (local dev) |
|---|---|---|
| IKEA | partial — JS-rendered content missing | ✅ full name + exact dimensions |
| Wayfair | ❌ HTTP 429 | likely works |
| Amazon | ❌ HTTP 404 (anti-bot) | ❌ still blocked |

So product import is best-effort on the deployed site and reliable when running locally
(`npm run dev:all`, which uses `server/index.js` and drives Playwright). To make it reliable in
production you'd need a rendering service (Browserless, ScrapingBee) or Vercel's Chromium layer.

## Local development

```bash
npm install
cp .env.example .env      # optional: put a key here to skip the in-app prompt while developing
npm run dev:all           # frontend + local API server (has the headless-browser product import)
```

`npm run dev` alone runs only the frontend; AI calls will fail until the API server is up.

## Cost reference

Defaults are Claude Opus 5 at `medium` effort for floor plans (~$0.25/plan) and Haiku 4.5 for
product imports (~$0.01/import). `medium` was measured at the same 4/4 room-placement accuracy as
`high` for half the price, which matters because visitors pay for their own runs. Override
per-deployment with `ANTHROPIC_MODEL`, `FLOOR_PLAN_EFFORT`, `STYLE_EFFORT`, `PRODUCT_MODEL`. See
`.env.example` for the accuracy/cost benchmark behind those defaults.
