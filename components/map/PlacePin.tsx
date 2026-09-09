"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import type { PlaceMarker } from "@/types/db"

// plan.md section 8: hollow outline for want_to_try, filled for everything
// else. Colour comes from the rating ramp; Phase 3 will interpolate by actual
// rating, so for now status drives it.
function fillFor(status: PlaceMarker["status"]): string {
  switch (status) {
    case "want_to_try":
      return "transparent"
    case "avoid":
      return "var(--color-r-low)"
    case "favorite":
      return "var(--color-r-top)"
    default:
      return "var(--color-r-good)"
  }
}

// Rendered from an array as data-driven children (section 5, Rule 3). Adding,
// removing or recolouring a pin must never touch the map instance itself.
export function PlacePin({
  place,
  selected,
  onSelect,
}: {
  place: PlaceMarker
  selected: boolean
  onSelect: (place: PlaceMarker) => void
}) {
  const hollow = place.status === "want_to_try"

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      onClick={() => onSelect(place)}
      zIndex={selected ? 10 : 1}
    >
      <div
        className="rounded-full transition-transform"
        style={{
          width: selected ? 22 : 16,
          height: selected ? 22 : 16,
          background: fillFor(place.status),
          border: `2.5px solid ${
            hollow ? "var(--color-r-none)" : "rgba(255,255,255,0.85)"
          }`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}
      />
    </AdvancedMarker>
  )
}
