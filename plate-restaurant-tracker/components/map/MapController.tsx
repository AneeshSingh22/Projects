"use client"

import { useEffect } from "react"
import { useMap } from "@vis.gl/react-google-maps"

// Pans the map to a requested position.
//
// Lives INSIDE <Map> so it can use useMap() to reach the instance the normal
// way. The alternative - holding a ref in the parent and calling methods on it
// - works but puts map-instance access in the component that also owns
// selection state, which is exactly the coupling section 5 warns leads to
// remounts.
//
// Panning is not a remount: moving an existing map costs nothing and is not
// billed. Only constructing a new one is.
export function MapController({
  target,
  onDone,
}: {
  target: { lat: number; lng: number } | null
  onDone: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    // Zoom in only if currently zoomed out far enough that the pin would be
    // ambiguous. Yanking the zoom when the user is already close is annoying.
    const zoom = map.getZoom() ?? 15
    if (zoom < 15) map.setZoom(16)
    onDone()
  }, [map, target, onDone])

  return null
}
