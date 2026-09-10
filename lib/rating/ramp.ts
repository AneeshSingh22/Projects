// The rating ramp - plan.md section 8.
//
// "Interpolate between stops for in-between ratings rather than using five hard
// buckets - a 7.5 should sit visibly between a 7 and an 8."
//
// The ramp runs the way food browns: pale and raw at the low end, deepening
// through ochre to a dark chili red at the top. It is the one place the app is
// allowed to be loud, so it is worth getting exactly right.

export type Rgb = [number, number, number]

// Kept in sync with the tokens in globals.css. Duplicated here as numbers
// because interpolation needs channel values, and CSS custom properties are
// strings that are not readable from JS without a live DOM.
const STOPS: { at: number; rgb: Rgb }[] = [
  { at: 0, rgb: [126, 146, 152] }, // --r-low   #7E9298
  { at: 4, rgb: [126, 146, 152] }, // --r-low   flat through the low end
  { at: 6, rgb: [201, 151, 63] },  // --r-mid   #C9973F
  { at: 8, rgb: [210, 84, 46] },   // --r-good  #D2542E
  { at: 10, rgb: [168, 42, 40] },  // --r-top   #A82A28
]

// Wishlist: no rating, so no position on the ramp at all.
export const RATING_NONE = "#6E8489" // --r-none

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function ratingRgb(rating: number): Rgb {
  const r = Math.min(10, Math.max(0, rating))

  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i]
    const hi = STOPS[i + 1]
    if (r >= lo.at && r <= hi.at) {
      const span = hi.at - lo.at
      const t = span === 0 ? 0 : (r - lo.at) / span
      return [
        Math.round(lerp(lo.rgb[0], hi.rgb[0], t)),
        Math.round(lerp(lo.rgb[1], hi.rgb[1], t)),
        Math.round(lerp(lo.rgb[2], hi.rgb[2], t)),
      ]
    }
  }
  return STOPS[STOPS.length - 1].rgb
}

export function ratingColor(rating: number | null | undefined): string {
  if (rating == null) return RATING_NONE
  const [r, g, b] = ratingRgb(rating)
  return `rgb(${r} ${g} ${b})`
}

// Ratings are numeric(3,1) in Postgres - one decimal place. Displaying 8 as
// "8.0" reads as more precision than was intended, so whole numbers lose the
// decimal and halves keep it.
export function formatRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1)
}
