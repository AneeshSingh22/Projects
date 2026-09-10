"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { ratingColor, RATING_NONE, formatRating } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// Pins are coloured by rating, not by status.
//
// The earlier version keyed colour off status alone, so a place rated 0.5 and
// one rated 10 rendered identically as long as both had been visited - which
// defeats the purpose of having a ramp at all. Colour now comes from the
// average rating, so the map answers "where was good?" at a glance.
//
// Status still decides the shape: an unrated wishlist place is a hollow ring,
// anything rated is a solid dot. So the two dimensions stay separable without
// relying on colour alone.
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
  const color = rated ? ratingColor(place.avg_rating) : RATING_NONE

  // Rated pins carry their score. At a glance the colour gives the gist and the
  // number gives the detail, without opening anything.
  const size = selected ? 30 : 24

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={
        rated
          ? `${place.name} — ${formatRating(place.avg_rating!)}`
          : place.name
      }
      onClick={() => onSelect(place)}
      zIndex={selected ? 10 : 1}
    >
      {/* Transparent padding keeps the visible pin small while the touch
          target stays near the 44px minimum for a thumb. */}
      <div className="flex h-11 w-11 items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full font-semibold transition-all duration-150"
          style={{
            width: size,
            height: size,
            background: rated ? color : "var(--color-surface)",
            border: `${rated ? 2 : 4}px solid ${color}`,
            color: "#fff",
            fontSize: selected ? 12 : 10,
            lineHeight: 1,
            boxShadow: selected
              ? "0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.6)"
              : "0 0 0 1.5px rgba(255,255,255,0.75), 0 1px 5px rgba(0,0,0,0.45)",
          }}
        >
          {rated ? formatRating(place.avg_rating!) : ""}
        </div>
      </div>
    </AdvancedMarker>
  )
}
