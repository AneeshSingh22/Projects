import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"

// Stamps the service worker with a build-unique cache version.
//
// Run as part of `npm run build`. Without this the cache name is constant
// across deploys, and because build assets are cached cache-first, a browser
// that has visited once keeps serving the old bundle indefinitely - features
// ship correctly and simply never appear.
//
// The stamp is a hash of the built manifest where available, falling back to
// the build timestamp, so it changes exactly when the output changes.
const SW = "public/sw.js"

let seed
try {
  seed = readFileSync(".next/BUILD_ID", "utf8").trim()
} catch {
  seed = String(Date.now())
}

const id = createHash("sha1").update(seed).digest("hex").slice(0, 10)
const src = readFileSync(SW, "utf8")
const next = src.replace(/const VERSION = "plate-[^"]*"/, `const VERSION = "plate-${id}"`)

if (next !== src) {
  writeFileSync(SW, next)
  console.log(`  service worker cache version -> plate-${id}`)
} else {
  console.log(`  service worker already at plate-${id}`)
}
