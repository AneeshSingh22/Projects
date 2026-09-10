"use client"

import { ratingColor, formatRating } from "@/lib/rating/ramp"

// plan.md section 9, Phase 3: "a slider with live color feedback along the ramp
// - the numeral changes color as he drags."
//
// A native range input rather than a custom control: it is keyboard accessible
// and screen-reader correct for free, and it gets the platform's own drag
// physics on touch, which no hand-rolled version matches.
export function RatingSlider({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const active = value ?? 7
  const color = ratingColor(value)

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="rating" className="text-text-dim text-sm">
          Rating
        </label>
        {value == null ? (
          <button
            type="button"
            onClick={() => onChange(7)}
            className="text-text-dim hover:text-text text-xs underline"
          >
            Add a rating
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-text-dim hover:text-text text-xs underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center gap-4">
        <span
          // The one place the 56px size from section 8's scale is used.
          className="font-display tabular-nums leading-none transition-colors"
          style={{ fontSize: "var(--text-rating)", color }}
        >
          {value == null ? "–" : formatRating(value)}
        </span>

        <input
          id="rating"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={active}
          onChange={(e) => onChange(Number(e.target.value))}
          className="plate-range h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            // The track fills with the rating's own colour up to the thumb, so
            // the ramp is legible while dragging rather than only at the end.
            background: `linear-gradient(to right, ${color} ${active * 10}%, var(--color-surface-raised) ${active * 10}%)`,
          }}
          aria-valuetext={value == null ? "No rating" : formatRating(value)}
        />
      </div>
    </div>
  )
}
