"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { formatRating } from "@/lib/rating/ramp"
import { CATEGORIES } from "@/lib/categories"
import { PinBody } from "./PinBody"
import type { PlaceMarker } from "@/types/db"

// Pins carry two independent signals, deliberately on different channels:
//
//   COLOUR = how good it was (the rating ramp)
//   ICON   = what kind of place it is (the category)
//
// Keeping them separate is the point. Colour alone meant a green dot could be a
// great restaurant, a great bar or a great basketball court, and at a glance
// the map became a field of indistinguishable dots. Now the badge answers "what
// is it" and the fill answers "was it good", and neither has to carry both jobs.
export function PlacePin({
  place,
  selected,
  onSelect,
}: {
  place: PlaceMarker
  selected: boolean
  onSelect: (place: PlaceMarker) => void
}) {
  const rated = place.avg_rating != null

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={
        rated
          ? `${place.name} — ${formatRating(place.avg_rating!)} · ${CATEGORIES[place.category].label}`
          : `${place.name} — ${CATEGORIES[place.category].label}`
      }
      onClick={() => onSelect(place)}
      zIndex={selected ? 10 : 1}
    >
      {/* Transparent padding keeps the visible pin small while the touch target
          stays near the 44px minimum for a thumb. */}
      <PinBody place={place} selected={selected} />
    </AdvancedMarker>
  )
}
