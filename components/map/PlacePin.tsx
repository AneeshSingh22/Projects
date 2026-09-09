"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import type { PlaceMarker } from "@/types/db"

// plan.md section 8: hollow for want_to_try, filled for everything else, with
// colour carrying meaning from the rating ramp.
//
// The ramp was designed against a dark map. Until the Map ID style is applied
// the base map is bright, so pins are drawn with a solid core, a white ring and
// a drop shadow. That reads on either background, so it is kept rather than
// being a temporary patch.
function colorFor(status: PlaceMarker["status"]): string {
  switch (status) {
    // No rating yet, so no position on the ramp. Given a warm red so it is
    // findable, and kept hollow-cored so it stays visually distinct from a
    // place that has actually been rated.
    case "want_to_try":
      return "var(--color-r-good)"
    case "avoid":
      return "var(--color-r-low)"
    case "favorite":
      return "var(--color-r-top)"
    default:
      return "var(--color-r-good)"
  }
}

// Data-driven children (section 5, Rule 3). Adding, removing or recolouring a
// pin must never touch the map instance.
export function PlacePin({
  place,
  selected,
  onSelect,
}: {
  place: PlaceMarker
  selected: boolean
  onSelect: (place: PlaceMarker) => void
}) {
  const color = colorFor(place.status)
  const wishlist = place.status === "want_to_try"
  const size = selected ? 24 : 18

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      onClick={() => onSelect(place)}
      zIndex={selected ? 10 : 1}
    >
      {/* Transparent padding around the dot: the visible pin stays small and
          quiet, while the touch target meets the ~44px minimum for a thumb. */}
      <div className="flex h-11 w-11 items-center justify-center">
        <div
          className="rounded-full transition-all duration-150"
          style={{
            width: size,
            height: size,
            // Wishlist reads as a ring; anything rated reads as a solid dot.
            background: wishlist ? "var(--color-surface)" : color,
            border: `${wishlist ? 4 : 3}px solid ${color}`,
            boxShadow: selected
              ? `0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.6)`
              : `0 0 0 1.5px rgba(255,255,255,0.75), 0 1px 5px rgba(0,0,0,0.45)`,
          }}
        />
      </div>
    </AdvancedMarker>
  )
}
