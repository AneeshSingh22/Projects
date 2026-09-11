"use client"

import { useEffect, useRef } from "react"
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps"
import type { Fix } from "@/lib/location/useLocation"

// The blue dot.
//
// Two parts, matching the convention every map app uses, because this is not a
// place to be original - people already know what a blue dot with a pale halo
// means:
//   - a solid dot at the reported position
//   - a translucent circle sized to the reported accuracy
//
// The halo is drawn as a real google.maps.Circle rather than a CSS circle,
// because accuracy is measured in METRES. A CSS circle would stay the same size
// on screen while zooming, which would imply the GPS got more precise as you
// zoomed in. A map circle scales with the map, which is the truth.
export function UserLocation({ fix }: { fix: Fix | null }) {
  const map = useMap()
  const circleRef = useRef<google.maps.Circle | null>(null)

  useEffect(() => {
    if (!map) return

    if (!fix) {
      circleRef.current?.setMap(null)
      return
    }

    // A very tight accuracy reading makes the halo invisible, and a very loose
    // one covers the city. Clamped so it stays informative either way.
    const radius = Math.min(Math.max(fix.accuracy, 12), 400)

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        strokeColor: "#1a73e8",
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: "#1a73e8",
        fillOpacity: 0.12,
        clickable: false,
        zIndex: 1,
      })
    }

    circleRef.current.setCenter({ lat: fix.lat, lng: fix.lng })
    circleRef.current.setRadius(radius)
    circleRef.current.setMap(map)
  }, [map, fix])

  // Torn down on unmount. An orphaned Circle keeps a reference to the map and
  // would leak across navigations.
  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null)
      circleRef.current = null
    }
  }, [])

  if (!fix) return null

  return (
    <AdvancedMarker
      position={{ lat: fix.lat, lng: fix.lng }}
      title="You are here"
      // Above the accuracy circle, below the place pins: knowing where you are
      // matters less than being able to tap the thing you were looking for.
      zIndex={2}
    >
      <div className="relative grid h-6 w-6 place-items-center">
        {/* Quiet pulse. Section 8 keeps the motion budget small, but a
            completely static dot reads as a stale screenshot rather than a
            live position. */}
        <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-[#1a73e8] opacity-20" />
        <span
          className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-[#1a73e8]"
          style={{ boxShadow: "0 1px 4px rgb(0 0 0 / 0.4)" }}
        />
      </div>
    </AdvancedMarker>
  )
}
