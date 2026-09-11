"use client"

import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { ratingColor, RATING_NONE, formatRating } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// Pins are coloured by rating, not status - colour has to carry information or
// the ramp is decoration. Status decides the shape instead: an unrated wishlist
// place is a hollow ring, anything rated is a filled teardrop with its score.
//
// The teardrop shape matters more on a light map than it did on a dark one. A
// plain circle reads as a generic map dot; a pin with a point reads as "someone
// placed this here", which is exactly what these are.
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
  const size = selected ? 40 : 34

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={
        rated ? `${place.name} — ${formatRating(place.avg_rating!)}` : place.name
      }
      onClick={() => onSelect(place)}
      zIndex={selected ? 10 : 1}
    >
      {/* Transparent padding keeps the visible pin small while the touch target
          stays near the 44px minimum for a thumb. */}
      <div className="flex h-12 w-12 items-end justify-center pb-0.5">
        <div
          className="relative grid place-items-center transition-all duration-200 ease-out"
          style={{
            width: size,
            height: size,
            filter: selected
              ? "drop-shadow(0 4px 10px rgb(26 36 39 / 0.45))"
              : "drop-shadow(0 2px 5px rgb(26 36 39 / 0.30))",
          }}
        >
          <svg
            viewBox="0 0 40 46"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* A teardrop: circle on top, tapering to a point at the anchor. */}
            <path
              d="M20 1.5c-10.2 0-18.5 8.1-18.5 18.1 0 10.4 12.3 21.1 17 24.8a2.4 2.4 0 0 0 3 0c4.7-3.7 17-14.4 17-24.8C39.5 9.6 31.2 1.5 21 1.5Z"
              fill={rated ? color : "var(--color-surface)"}
              stroke={rated ? "rgba(255,255,255,0.92)" : color}
              strokeWidth={rated ? 2 : 3.5}
            />
          </svg>
          {rated && (
            <span
              className="relative font-semibold tabular-nums text-white"
              style={{
                fontSize: selected ? 14 : 12,
                lineHeight: 1,
                // Nudged up: the glyph must sit in the round head of the
                // teardrop, not in its point.
                transform: "translateY(-14%)",
              }}
            >
              {formatRating(place.avg_rating!)}
            </span>
          )}
        </div>
      </div>
    </AdvancedMarker>
  )
}
