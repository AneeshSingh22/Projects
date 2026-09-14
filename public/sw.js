// Service worker - plan.md section 9, Phase 6.
//
// Deliberately hand-written rather than generated. The whole file is about 80
// lines, it is the only thing standing between the app and a blank screen in
// airplane mode, and a caching bug here serves stale code that survives a
// refresh. That is worth being able to read end to end.
//
// Scope, per HANDOFF 5a item 7: the app shell and the user's places and visits
// are cached. Photos are NOT. They live behind signed URLs that expire after an
// hour, so a cached photo URL is worthless by the time it matters - caching the
// image blobs themselves would work but is a real chunk of extra machinery for
// something rarely needed offline.

// Cache version, derived from the build rather than typed by hand.
//
// A hand-maintained constant has the same flaw as any manual release step: it
// gets forgotten, and the failure is invisible. That is exactly what happened -
// features deployed correctly and never appeared, because this worker kept
// serving the previous build's JavaScript from a cache that was never evicted.
//
// __BUILD_ID__ is replaced at build time (see scripts/stamp-sw.mjs), so every
// deploy produces a new cache name and the activate handler below drops every
// older one. Nothing to remember.
const VERSION = "plate-a484e7643a"
const SHELL = `${VERSION}-shell`
const DATA = `${VERSION}-data`

// Only the shell is precached. Pages are handled at request time because they
// are server-rendered and personalised.
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) =>
        // addAll rejects wholesale if any single item 404s, which would leave
        // no cache at all. Individual puts degrade gracefully instead.
        Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Never touch anything cross-origin: Google Maps tiles, fonts, and Supabase
  // signed URLs all handle their own caching, and intercepting them here would
  // break auth or serve expired links.
  if (url.origin !== self.location.origin) return

  // Never cache auth. A cached login or sign-out response is a security bug,
  // not a performance win.
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/api/")) {
    return
  }

  // Navigations: network first, falling back to the cached shell. The app must
  // show fresh data when online, and something rather than a browser error
  // page when not.
  //
  // Network-first is load-bearing for updates as well as data: the HTML names
  // which hashed JS bundle to load, so serving stale HTML pins the whole app to
  // an old build.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(DATA).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match("/"))
            .then((hit) => hit || Response.error()),
        ),
    )
    return
  }

  // Build assets are content-hashed, so a cache hit is always correct for THAT
  // url and a network trip is wasted. Stale bundles are handled by the VERSION
  // bump above evicting the whole cache, not by re-fetching individual files.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(SHELL).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
})
