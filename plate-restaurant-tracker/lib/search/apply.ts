import type { SearchFilters } from "@/app/api/ask/route"
import type { PlaceCategory } from "@/lib/categories"
import type { PlaceMarker } from "@/types/db"

// Applies parsed filters to places held in memory.
//
// All the correctness lives here rather than in the model. The model proposes
// criteria; this decides what matches. That split means a bad parse produces
// wrong-but-explainable results instead of invented places, and it is testable
// without calling an API.

export type SearchablePlace = PlaceMarker & {
  // Optional enrichment used only when the question mentions people, dishes or
  // dates. Loaded lazily so the common case stays a pure in-memory filter.
  companions?: string[]
  details?: string[]
  lastVisitedOn?: string | null
  maxPricePaid?: number | null
}

const EARTH_RADIUS_KM = 6371

// Haversine. Straight-line distance is the right measure here: this ranks
// candidates, it does not give directions.
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// Lowercase and strip accents, so a plain "cafe" matches one written with
// an accent. The combining-marks range is written as escapes rather than as
// literal characters, which survive editors and encodings far less reliably.
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
}

export type SearchResult = {
  place: SearchablePlace
  distanceKm: number | null
}

export function applyFilters(
  places: SearchablePlace[],
  filters: SearchFilters,
  origin: { lat: number; lng: number } | null,
): SearchResult[] {
  const text = filters.text ? normalise(filters.text) : null
  const wanted = new Set((filters.categories ?? []) as PlaceCategory[])
  const people = (filters.companions ?? []).map(normalise)

  const cutoff =
    typeof filters.sinceDaysAgo === "number"
      ? new Date(Date.now() - filters.sinceDaysAgo * 86_400_000)
          .toISOString()
          .slice(0, 10)
      : null

  const matched = places.filter((p) => {
    if (wanted.size > 0 && !wanted.has(p.category)) return false

    // A place with no rating has no position on the scale, so a minimum rating
    // excludes it rather than treating absence as zero - "places I liked"
    // should not surface things never rated.
    if (typeof filters.minRating === "number") {
      if (p.avg_rating == null || p.avg_rating < filters.minRating) return false
    }
    if (typeof filters.maxRating === "number") {
      if (p.avg_rating == null || p.avg_rating > filters.maxRating) return false
    }

    if (filters.unvisitedOnly && p.visit_count > 0) return false
    if (filters.visitedOnly && p.visit_count === 0) return false

    if (typeof filters.maxPrice === "number") {
      if (p.maxPricePaid == null || p.maxPricePaid > filters.maxPrice) return false
    }

    if (cutoff && (p.lastVisitedOn ?? "") < cutoff) return false

    if (people.length > 0) {
      const theirs = (p.companions ?? []).map(normalise)
      // Substring both ways, so "rish" matches "Rish" and "Rishi" matches
      // "Rish" - people write names inconsistently in their own notes.
      const hit = people.some((q) =>
        theirs.some((c) => c.includes(q) || q.includes(c)),
      )
      if (!hit) return false
    }

    if (text) {
      const haystack = normalise(
        [p.name, p.cuisine ?? "", ...(p.details ?? [])].join(" "),
      )
      // ANY word matching is enough, not every word.
      //
      // Requiring all of them was tried first and was wrong. Asked "basketball
      // courts I have been to", the model correctly sets category=sports and
      // also redundantly sets text="basketball courts" - and requiring both
      // words in the name excluded "Kennedy Recreation Center", so the question
      // returned nothing while the place sat right there on the map.
      //
      // Being generous here is the right trade: the category, rating and
      // visited filters already narrow hard, and a few extra results are much
      // better than a confident empty list.
      const words = text.split(/\s+/).filter((w) => w.length > 2)
      if (words.length > 0 && !words.some((w) => haystack.includes(w))) {
        return false
      }
    }

    return true
  })

  const results: SearchResult[] = matched.map((place) => ({
    place,
    distanceKm: origin ? distanceKm(origin, place) : null,
  }))

  // Nearest first when the question was about proximity, best first otherwise.
  // "cheap Thai I liked near here" is asking to walk somewhere, so distance
  // wins; "places I loved" is asking to remember, so rating wins.
  if (filters.nearMe && origin) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  } else {
    results.sort((a, b) => (b.place.avg_rating ?? -1) - (a.place.avg_rating ?? -1))
  }

  return results
}
