"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// One shared location source for the whole app.
//
// Before this, "What now" and the Ask panel each called getCurrentPosition
// separately, which meant two permission prompts and two independent readings.
// This centralises it: one watch, one permission, everything reads the same
// coordinate.
//
// Privacy shape, stated plainly because it is the kind of thing worth being
// able to answer:
//   - Coordinates never leave the browser. Distance is computed locally against
//     places already in memory. Nothing is sent to the server, to Supabase, or
//     to Google.
//   - Nothing is persisted. Closing the tab forgets it entirely.
//   - The watch is only started when something asks for it, and is torn down
//     when the last consumer stops.

export type Fix = {
  lat: number
  lng: number
  // Radius in metres the true position is likely within. Rendered as the
  // translucent halo, the way every map app shows GPS uncertainty.
  accuracy: number
  heading: number | null
}

type State = {
  fix: Fix | null
  status: "idle" | "locating" | "active" | "denied" | "unavailable"
}

// Module-level so multiple components share one watch rather than each
// starting their own.
let watchId: number | null = null
let subscribers = 0
const listeners = new Set<(s: State) => void>()
let current: State = { fix: null, status: "idle" }

function publish(next: State) {
  current = next
  for (const l of listeners) l(next)
}

function startWatch() {
  if (watchId != null) return
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    publish({ fix: null, status: "unavailable" })
    return
  }

  publish({ ...current, status: current.fix ? "active" : "locating" })

  watchId = navigator.geolocation.watchPosition(
    (p) => {
      publish({
        status: "active",
        fix: {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          // Only meaningful while actually moving; browsers report null when
          // stationary, and a dot that spins while you stand still is worse
          // than one with no direction at all.
          heading:
            p.coords.heading != null && !Number.isNaN(p.coords.heading)
              ? p.coords.heading
              : null,
        },
      })
    },
    (err) => {
      publish({
        fix: null,
        status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
      })
    },
    {
      enableHighAccuracy: true,
      // A stale fix up to 15s old is fine and avoids waking the GPS constantly,
      // which is the main battery cost of a live dot.
      maximumAge: 15_000,
      timeout: 20_000,
    },
  )
}

function stopWatch() {
  if (watchId != null && typeof navigator !== "undefined") {
    navigator.geolocation.clearWatch(watchId)
  }
  watchId = null
}

export function useLocation(enabled: boolean) {
  const [state, setState] = useState<State>(current)
  const counted = useRef(false)

  useEffect(() => {
    if (!enabled) return

    listeners.add(setState)
    if (!counted.current) {
      subscribers += 1
      counted.current = true
    }
    startWatch()

    return () => {
      listeners.delete(setState)
      if (counted.current) {
        subscribers -= 1
        counted.current = false
      }
      if (subscribers <= 0) stopWatch()
    }
  }, [enabled])

  // A one-shot read for callers that want a coordinate now without subscribing,
  // resolving null rather than throwing when permission is refused.
  const once = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    if (current.fix) {
      return Promise.resolve({ lat: current.fix.lat, lng: current.fix.lng })
    }
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        return resolve(null)
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 6000, maximumAge: 120_000 },
      )
    })
  }, [])

  return { ...state, once }
}
