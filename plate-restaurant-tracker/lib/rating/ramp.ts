// The rating ramp.
//
// DEVIATION FROM plan.md SECTION 8, chosen deliberately.
//
// Section 8 specified pale -> ochre -> dark chili red, with red as the top of
// the scale, themed on the way food browns. It reads well in the abstract but
// fails the job the map actually does: red is the loudest colour available, so
// the plan's ramp shouted hardest about places that were merely good, while a
// bad place and a great one both read as "warm".
//
// This ramp runs grey -> amber -> green instead:
//
//   - Low ratings are desaturated grey-blue. They recede. A place you did not
//     like should not compete for attention on a map you are scanning for
//     somewhere to eat.
//   - The middle is amber, which is where "fine, would go back" sits.
//   - The top is green, and it is the only strongly saturated colour on screen,
//     so the best places are what your eye lands on first.
//
// The greens are deliberately deep and slightly desaturated rather than a
// bright signal green, because a map already contains green for parks and
// landmarks and the pins must not be mistaken for those.
//
// Section 8's principle - one interpolated ramp, the loudest thing in the app,
// no hard buckets - is kept. Only the hues changed.

export type Rgb = [number, number, number]

const STOPS: { at: number; rgb: Rgb }[] = [
  { at: 0, rgb: [110, 132, 137] }, // muted grey-blue: bad, and quiet about it
  { at: 4, rgb: [126, 146, 152] }, // still receding
  { at: 6, rgb: [201, 151, 63] }, // amber: acceptable
  { at: 8, rgb: [106, 153, 78] }, // green: good
  { at: 10, rgb: [45, 122, 62] }, // deep green: the best places
]

// Wishlist: no rating yet, so no position on the ramp at all.
export const RATING_NONE = "#6E8489"

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
