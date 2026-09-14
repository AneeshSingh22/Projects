"use client"

import { useRef, useState } from "react"
import { ratingColor, formatRating } from "@/lib/rating/ramp"

// The rating input, as a dial rather than a slider.
//
// plan.md section 9 asked for "a slider with live color feedback along the
// ramp". This keeps that behaviour - the numeral and the arc both track the
// ramp as you drag - but arranges it as a ring around the number, which is both
// more tactile on a phone and lets the 56px numeral from section 8 sit inside
// the control rather than beside it.
//
// Still a real input underneath: a visually-hidden range element carries the
// keyboard and screen-reader behaviour, so arrow keys work and the value is
// announced. Dragging an SVG alone would have neither.

const SIZE = 168
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS
// The arc spans 270 degrees with a gap at the bottom, so the start and end of
// the scale are visually distinct - a full circle has no beginning.
const SWEEP = 0.75

export function RatingDial({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const active = value ?? 7
  const color = ratingColor(value)

  // Pointer position -> rating.
  //
  // The SVG is rotated 135 degrees so the arc's gap sits at the bottom, which
  // means a pointer angle measured in page space has to be un-rotated before it
  // can be compared against the arc. Getting this wrong is not subtle - the
  // first version omitted it and the dial jumped to unrelated values. Verified
  // against the thumb placement: 0 lands bottom-left, 5 at the top, 10
  // bottom-right, and the mapping is monotonic across the sweep.
  function ratingFromPoint(clientX: number, clientY: number): number {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return active
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const deg = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI)
    const along = (deg - 135 + 360) % 360
    const frac = along / (SWEEP * 360)

    // Half-point steps, matching the slider this replaces.
    return Math.round(Math.min(1, Math.max(0, frac)) * 10 * 2) / 2
  }

  function handleMove(e: React.PointerEvent) {
    if (!dragging) return
    onChange(ratingFromPoint(e.clientX, e.clientY))
  }

  const dash = CIRC * SWEEP
  const filled = dash * (active / 10)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          className="touch-none"
          style={{ transform: "rotate(135deg)" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setDragging(true)
            onChange(ratingFromPoint(e.clientX, e.clientY))
          }}
          onPointerMove={handleMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface-raised)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
          />
          {/* Filled arc, coloured by the rating itself */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRC}`}
            style={{
              // No transition while dragging: the arc must track the finger
              // exactly, and easing during a drag feels like lag.
              transition: dragging ? "none" : "stroke-dasharray 200ms ease-out, stroke 200ms ease-out",
            }}
          />
          {/* Thumb */}
          <circle
            cx={
              SIZE / 2 +
              RADIUS * Math.cos(2 * Math.PI * SWEEP * (active / 10))
            }
            cy={
              SIZE / 2 +
              RADIUS * Math.sin(2 * Math.PI * SWEEP * (active / 10))
            }
            r={STROKE * 0.8}
            fill="var(--color-text)"
            stroke="var(--color-ink)"
            strokeWidth={2}
            style={{
              transition: dragging ? "none" : "all 200ms ease-out",
              filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.5))",
            }}
          />
        </svg>

        {/* The 56px numeral from section 8's scale, inside the ring. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            className="font-display tabular-nums leading-none transition-colors"
            style={{ fontSize: "var(--text-rating)", color }}
          >
            {value == null ? "–" : formatRating(value)}
          </span>
        </div>
      </div>

      {/* The real input. Visually hidden but focusable, so arrow keys adjust the
          rating and screen readers announce it - behaviour an SVG cannot
          provide on its own. */}
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={active}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Rating out of 10"
        aria-valuetext={value == null ? "No rating" : formatRating(value)}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => onChange(value == null ? 7 : null)}
        className="text-text-dim hover:text-text mt-3 text-xs underline"
      >
        {value == null ? "Add a rating" : "Clear rating"}
      </button>
    </div>
  )
}
