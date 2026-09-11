"use server"

import { createClient } from "@/lib/supabase/server"
import type { PlaceCategory } from "@/lib/categories"

// One query behind the timeline, the budget tab and the year in review. They
// are three readings of the same data, so fetching it three times would be
// wasteful and could show three slightly different answers if a write landed
// in between.

export type TimelineVisit = {
  id: string
  visitedOn: string
  rating: number | null
  notes: string | null
  dishes: string[]
  activity: string[]
  companions: string[]
  pricePaid: number | null
  wouldReturn: boolean | null
  placeId: string
  placeName: string
  category: PlaceCategory
  lat: number
  lng: number
  photoCount: number
}

export type Stats = {
  visits: TimelineVisit[]
  totals: {
    visitCount: number
    placeCount: number
    totalSpend: number
    ratedCount: number
    avgRating: number | null
    photoCount: number
    firstVisitOn: string | null
  }
  spendByCategory: { category: PlaceCategory; total: number; visits: number }[]
  spendByMonth: { month: string; total: number }[]
  visitsByCategory: { category: PlaceCategory; count: number }[]
  topPlaces: { id: string; name: string; avg: number; visits: number }[]
  companions: { name: string; visits: number; avgRating: number | null }[]
  ratingOverTime: { month: string; avg: number; count: number }[]
}

export async function getStats(): Promise<Stats> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const empty: Stats = {
    visits: [],
    totals: {
      visitCount: 0,
      placeCount: 0,
      totalSpend: 0,
      ratedCount: 0,
      avgRating: null,
      photoCount: 0,
      firstVisitOn: null,
    },
    spendByCategory: [],
    spendByMonth: [],
    visitsByCategory: [],
    topPlaces: [],
    companions: [],
    ratingOverTime: [],
  }
  if (!user) return empty

  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, visited_on, rating, notes, dishes, activity, companions, price_paid, would_return, place_id, places(id, name, category, lat, lng), photos(id)",
    )
    .eq("user_id", user.id)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to load stats: ${error.message}`)

  type Row = {
    id: string
    visited_on: string
    rating: number | null
    notes: string | null
    dishes: string[] | null
    activity: string[] | null
    companions: string[] | null
    price_paid: number | null
    would_return: boolean | null
    place_id: string
    places: {
      id: string
      name: string
      category: PlaceCategory
      lat: number
      lng: number
    } | null
    photos: { id: string }[] | null
  }

  const rows = (data ?? []) as unknown as Row[]

  const visits: TimelineVisit[] = rows
    .filter((r) => r.places != null)
    .map((r) => ({
      id: r.id,
      visitedOn: r.visited_on,
      rating: r.rating != null ? Number(r.rating) : null,
      notes: r.notes,
      dishes: r.dishes ?? [],
      activity: r.activity ?? [],
      companions: r.companions ?? [],
      pricePaid: r.price_paid != null ? Number(r.price_paid) : null,
      wouldReturn: r.would_return,
      placeId: r.places!.id,
      placeName: r.places!.name,
      category: r.places!.category,
      lat: r.places!.lat,
      lng: r.places!.lng,
      photoCount: (r.photos ?? []).length,
    }))

  const { count: placeCount } = await supabase
    .from("places")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)

  const rated = visits.filter((v) => v.rating != null)
  const spends = visits.filter((v) => v.pricePaid != null)

  // --- spend by category -------------------------------------------------
  const byCat = new Map<PlaceCategory, { total: number; visits: number }>()
  for (const v of visits) {
    const e = byCat.get(v.category) ?? { total: 0, visits: 0 }
    e.visits += 1
    e.total += v.pricePaid ?? 0
    byCat.set(v.category, e)
  }

  // --- spend and ratings by month ----------------------------------------
  const monthSpend = new Map<string, number>()
  const monthRating = new Map<string, { sum: number; n: number }>()
  for (const v of visits) {
    const m = v.visitedOn.slice(0, 7)
    if (v.pricePaid != null) {
      monthSpend.set(m, (monthSpend.get(m) ?? 0) + v.pricePaid)
    }
    if (v.rating != null) {
      const e = monthRating.get(m) ?? { sum: 0, n: 0 }
      e.sum += v.rating
      e.n += 1
      monthRating.set(m, e)
    }
  }

  // --- per place ---------------------------------------------------------
  const perPlace = new Map<string, { name: string; sum: number; n: number; visits: number }>()
  for (const v of visits) {
    const e = perPlace.get(v.placeId) ?? { name: v.placeName, sum: 0, n: 0, visits: 0 }
    e.visits += 1
    if (v.rating != null) {
      e.sum += v.rating
      e.n += 1
    }
    perPlace.set(v.placeId, e)
  }

  // --- companions --------------------------------------------------------
  // Names are normalised for grouping but the original spelling is kept for
  // display, since people write their friends' names inconsistently.
  const perPerson = new Map<string, { display: string; visits: number; sum: number; n: number }>()
  for (const v of visits) {
    for (const raw of v.companions) {
      const key = raw.trim().toLowerCase()
      if (!key) continue
      const e = perPerson.get(key) ?? { display: raw.trim(), visits: 0, sum: 0, n: 0 }
      e.visits += 1
      if (v.rating != null) {
        e.sum += v.rating
        e.n += 1
      }
      perPerson.set(key, e)
    }
  }

  const dates = visits.map((v) => v.visitedOn).sort()

  return {
    visits,
    totals: {
      visitCount: visits.length,
      placeCount: placeCount ?? 0,
      totalSpend: spends.reduce((s, v) => s + (v.pricePaid ?? 0), 0),
      ratedCount: rated.length,
      avgRating: rated.length
        ? rated.reduce((s, v) => s + (v.rating ?? 0), 0) / rated.length
        : null,
      photoCount: visits.reduce((s, v) => s + v.photoCount, 0),
      firstVisitOn: dates[0] ?? null,
    },
    spendByCategory: [...byCat.entries()]
      .map(([category, e]) => ({ category, ...e }))
      .sort((a, b) => b.total - a.total),
    spendByMonth: [...monthSpend.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    visitsByCategory: [...byCat.entries()]
      .map(([category, e]) => ({ category, count: e.visits }))
      .sort((a, b) => b.count - a.count),
    topPlaces: [...perPlace.entries()]
      .filter(([, e]) => e.n > 0)
      .map(([id, e]) => ({ id, name: e.name, avg: e.sum / e.n, visits: e.visits }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5),
    companions: [...perPerson.values()]
      .map((e) => ({
        name: e.display,
        visits: e.visits,
        avgRating: e.n > 0 ? e.sum / e.n : null,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8),
    ratingOverTime: [...monthRating.entries()]
      .map(([month, e]) => ({ month, avg: e.sum / e.n, count: e.n }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  }
}
