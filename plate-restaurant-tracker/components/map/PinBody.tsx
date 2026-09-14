"use client"

import { ratingColor, RATING_NONE, formatRating } from "@/lib/rating/ramp"
import { CATEGORIES } from "@/lib/categories"
import type { PlaceMarker } from "@/types/db"

// The visual body of a pin, with no marker attached.
//
// Extracted so the clustered and unclustered paths render the SAME thing. The
// clusterer needs a DOM node rather than React children, and the first version
// of that was a separate HTML string - which immediately drifted, dropping the
// category badge that distinguishes a bar from a restaurant. One component
// means that class of drift cannot happen again.
//
// Two independent signals, deliberately on different channels:
//   COLOUR = how good it was (the rating ramp)
//   ICON   = what kind of place it is (the category)
export function PinBody({
  place,
  selected,
}: {
  place: PlaceMarker
  selected: boolean
}) {
  const rated = place.avg_rating != null
  const color = rated ? ratingColor(place.avg_rating) : RATING_NONE
  const Icon = CATEGORIES[place.category].icon
  const size = selected ? 52 : 44

  return (
    <div className="flex h-14 w-14 items-end justify-center pb-0.5">
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
            stroke={rated ? "rgba(255,255,255,0.95)" : color}
            strokeWidth={rated ? 2 : 3.5}
          />
        </svg>

        {rated ? (
          <span
            // Dark ink, not white: these fills are tuned to read on a dark
            // panel, and white on top of them measured as low as 2.63:1.
            className="text-ink relative font-bold tabular-nums"
            style={{
              fontSize: selected ? 18 : 15,
              lineHeight: 1,
              transform: "translateY(-14%)",
            }}
          >
            {formatRating(place.avg_rating!)}
          </span>
        ) : (
          // Unrated places show the category icon in the head instead of a
          // number, so a wishlist pin still says what kind of place it is.
          <Icon
            className="relative"
            style={{
              width: selected ? 18 : 15,
              height: selected ? 18 : 15,
              color,
              transform: "translateY(-14%)",
            }}
          />
        )}

        {/* Category badge, top-right of the head. Small on purpose: a
            secondary signal should be readable when looked for and ignorable
            when not. */}
        {rated && (
          <span
            className="bg-surface border-surface absolute grid place-items-center rounded-full border"
            style={{
              width: selected ? 20 : 17,
              height: selected ? 20 : 17,
              top: selected ? -1 : 0,
              right: selected ? -1 : 0,
            }}
          >
            <Icon
              className="text-text"
              style={{ width: selected ? 11 : 9, height: selected ? 11 : 9 }}
            />
          </span>
        )}
      </div>
    </div>
  )
}
