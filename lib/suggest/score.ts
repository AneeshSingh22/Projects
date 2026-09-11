import { distanceKm } from "@/lib/search/apply"
import { dealStatus } from "@/lib/deals/active"
import type { SearchablePlace } from "@/lib/search/apply"
import type { Deal } from "@/types/db"

// Scoring for "what should I do right now?".
//
// Deliberately plain arithmetic rather than an LLM. Three reasons:
//
//   1. It has to be explainable. Every suggestion shows the reasons that earned
//      it, built from the same numbers that produced the score. A model would
//      have to be asked to justify itself afterwards, which invites it to make
//      up a justification that was not the actual cause.
//   2. It has to be instant. This is a button you press while standing outside
//      deciding where to go; a two-second round trip is the difference between
//      using it and not.
//   3. It costs nothing and cannot fail. No quota, no outage, no fallback path.
//
// The weights below are judgement calls, written down so they can be argued
// with rather than buried.

export type Suggestion = {
  place: SearchablePlace
  score: number
  reasons: string[]
  distanceKm: number | null
  activeDeal: Deal | null
}

export type SuggestContext = {
  now: Date
  origin: { lat: number; lng: number } | null
  // Places the user has already been shown this session, so pressing the button
  // again offers something else rather than repeating itself.
  exclude?: Set<string>
}

// Rough walking/driving bands. Distance dominates the score because everything
// else is irrelevant if you will not actually go.
function proximityPoints(km: number | null): { pts: number; label: string | null } {
  if (km == null) return { pts: 0, label: null }
  if (km <= 0.4) return { pts: 40, label: `${Math.round(km * 1000)} m away` }
  if (km <= 1.0) return { pts: 32, label: `${Math.round(km * 1000)} m away` }
  if (km <= 2.5) return { pts: 22, label: `${km.toFixed(1)} km away` }
  if (km <= 6) return { pts: 10, label: `${km.toFixed(1)} km away` }
  if (km <= 15) return { pts: 2, label: `${km.toFixed(0)} km away` }
  return { pts: -10, label: `${km.toFixed(0)} km away` }
}

// Food is a different proposition at 9am and 9pm. These windows are not
// cleverness, just the obvious shape of a day - and they only nudge, never
// exclude, because people do eat ramen for breakfast.
function timeFitPoints(
  place: SearchablePlace,
  now: Date,
): { pts: number; label: string | null } {
  const hour = now.getHours()
  const cat = place.category

  if (cat === "food_drink") {
    if (hour >= 6 && hour < 11) return { pts: 8, label: "good for breakfast" }
    if (hour >= 11 && hour < 15) return { pts: 12, label: "lunchtime" }
    if (hour >= 17 && hour < 22) return { pts: 14, label: "dinnertime" }
    if (hour >= 22 || hour < 2) return { pts: 6, label: "still late enough" }
    return { pts: 0, label: null }
  }

  if (cat === "outdoors") {
    // Daylight only. Suggesting a park at 11pm is the kind of thing that makes
    // people stop trusting a recommender.
    if (hour >= 8 && hour < 18) return { pts: 12, label: "daylight left" }
    return { pts: -25, label: null }
  }

  if (cat === "sports") {
    if (hour >= 7 && hour < 21) return { pts: 8, label: null }
    return { pts: -15, label: null }
  }

  if (cat === "entertainment") {
    if (hour >= 17 && hour < 24) return { pts: 12, label: "good time for it" }
    return { pts: 0, label: null }
  }

  return { pts: 0, label: null }
}

export function suggest(
  places: SearchablePlace[],
  deals: Deal[],
  ctx: SuggestContext,
  limit = 3,
): Suggestion[] {
  const dealsByPlace = new Map<string, Deal[]>()
  for (const d of deals) {
    const list = dealsByPlace.get(d.place_id) ?? []
    list.push(d)
    dealsByPlace.set(d.place_id, list)
  }

  const scored: Suggestion[] = []

  for (const place of places) {
    if (ctx.exclude?.has(place.id)) continue

    const reasons: string[] = []
    let score = 0

    const km = ctx.origin ? distanceKm(ctx.origin, place) : null
    const prox = proximityPoints(km)
    score += prox.pts
    if (prox.label && prox.pts >= 22) reasons.push(prox.label)

    // A live deal is the single strongest signal, because it is the one thing
    // that expires. Somewhere good will still be good tomorrow.
    let activeDeal: Deal | null = null
    for (const d of dealsByPlace.get(place.id) ?? []) {
      const st = dealStatus(d, ctx.now)
      if (st.state === "active") {
        activeDeal = d
        score += 35
        reasons.push(
          st.endsInMinutes != null && st.endsInMinutes < 180
            ? `${d.description}, ${st.endsInMinutes < 60 ? `${st.endsInMinutes}m` : `${Math.floor(st.endsInMinutes / 60)}h`} left`
            : d.description,
        )
        break
      }
    }

    const fit = timeFitPoints(place, ctx.now)
    score += fit.pts
    if (fit.label) reasons.push(fit.label)

    if (place.avg_rating != null) {
      // Rating maps to roughly -10..+25, so a great place beats a mediocre one
      // but never beats a great place that is much closer.
      score += (place.avg_rating - 6) * 5
      if (place.avg_rating >= 8) {
        reasons.push(`you rated it ${place.avg_rating.toFixed(1).replace(/\.0$/, "")}`)
      }
    } else {
      // Never been. Worth a nudge - the wishlist exists to be worked through,
      // and section 1 names "what did I want to try around here" as a core job.
      score += 12
      reasons.push("on your list, never been")
    }

    // Gentle decay on somewhere visited very recently, so the suggestion is not
    // always the place you went yesterday.
    if (place.lastVisitedOn) {
      const days =
        (ctx.now.getTime() - new Date(place.lastVisitedOn).getTime()) / 86_400_000
      if (days < 7) score -= 20
      else if (days < 21) score -= 8
      else if (days > 120) {
        score += 6
        reasons.push("been a while")
      }
    }

    scored.push({ place, score, reasons: reasons.slice(0, 3), distanceKm: km, activeDeal })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
