"use client"

import { useEffect } from "react"
import { useMap } from "@vis.gl/react-google-maps"

// Permanent dev-only canary for plan.md section 2.2: the map must initialise
// exactly once per session, because Google bills per initialisation and a
// remount loop is the one realistic way this project generates an invoice.
//
// This is a rewrite of the version in plan.md section 5, which counted React
// mounts in sessionStorage. That version reported a false alarm in two ordinary
// situations, and a canary that cries wolf gets ignored:
//
//   1. React Strict Mode (on by default in dev) invokes effects twice, so it
//      read 2 on the very first load.
//   2. sessionStorage outlives a page reload, so refreshing showed 2, 3, 4...
//      even though each reload is legitimately one new map load.
//
// What actually costs money is the number of google.maps.Map instances created.
// So that is what this counts. useMap() returns the underlying instance, and
// identity is tracked in a module-level Set:
//
//   - Strict Mode remounts hand back the same instance    -> size stays 1
//   - Client-side navigation keeps the module alive       -> size stays 1
//   - A real remount constructs a new instance            -> size becomes 2, alarm
//   - A full page reload resets the module                -> back to 1, correct,
//     because that genuinely is one fresh map load
const seen = new Set<google.maps.Map>()

export function MapMountCounter() {
  const map = useMap()

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    if (!map) return
    if (seen.has(map)) return

    seen.add(map)
    const n = seen.size

    if (n === 1) {
      console.warn(`[MAP MOUNT] count = ${n}`)
    } else {
      console.error(
        `[MAP MOUNT] count = ${n} — MAP REMOUNTED. This costs money. ` +
          `A new google.maps.Map was constructed; see plan.md section 5. ` +
          `Look for a conditional render, a changing key, or the map being ` +
          `nested inside a component that re-renders on selection state.`,
      )
    }
  }, [map])

  return null
}
