"use server"

import { createClient } from "@/lib/supabase/server"
import type { SearchablePlace } from "@/lib/search/apply"

// Loads places with the extra visit-derived fields that questions can reference:
// who you were with, what you ate or did, when you last went, and what you paid.
//
// Fetched only when a question is asked rather than on every page load. The map
// itself needs none of this, and a question is a deliberate action where a
// moment of latency is acceptable - whereas the map appearing slowly is not.
export async function getSearchablePlaces(): Promise<SearchablePlace[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("places")
    // One string literal, not a concatenation: supabase-js infers the result
    // type by parsing this at compile time, and a concatenated expression is
    // opaque to it, which collapses the row type to an error placeholder.
    .select(
      "id, name, lat, lng, status, category, cuisine, google_place_id, visits(rating, companions, dishes, activity, visited_on, price_paid)",
    )
    .eq("user_id", user.id)

  if (error) throw new Error(`Search load failed: ${error.message}`)

  type VisitRow = {
    rating: number | null
    companions: string[] | null
    dishes: string[] | null
    activity: string[] | null
    visited_on: string
    price_paid: number | null
  }
  type Row = Omit<
    SearchablePlace,
    | "avg_rating"
    | "visit_count"
    | "companions"
    | "details"
    | "lastVisitedOn"
    | "maxPricePaid"
  > & { visits: VisitRow[] | null }

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const visits = row.visits ?? []
    const rated = visits.filter((v) => v.rating != null)
    const prices = visits
      .map((v) => v.price_paid)
      .filter((p): p is number => p != null)
    const dates = visits.map((v) => v.visited_on).sort()

    const { visits: _drop, ...place } = row
    void _drop

    return {
      ...place,
      visit_count: visits.length,
      avg_rating: rated.length
        ? rated.reduce((sum, v) => sum + Number(v.rating), 0) / rated.length
        : null,
      companions: visits.flatMap((v) => v.companions ?? []),
      // Dishes and activity are searched together: someone asking for "noodles"
      // does not care which column it landed in.
      details: visits.flatMap((v) => [...(v.dishes ?? []), ...(v.activity ?? [])]),
      lastVisitedOn: dates.length ? dates[dates.length - 1] : null,
      // Cheapest visit, not the average: "cheap places" means somewhere you can
      // eat cheaply, even if you once had an expensive meal there.
      maxPricePaid: prices.length ? Math.min(...prices) : null,
    }
  })
}
