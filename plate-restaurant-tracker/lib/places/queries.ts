import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { PlaceMarker } from "@/types/db"

// Every place plus its visit stats, in one round trip.
//
// Deliberate departure from plan.md section 9, which specified a bounding-box
// query debounced per pan. See HANDOFF 5a item 1: one person's list is well
// under 100KB, so fetching once and filtering in memory removes a network call
// from every pan, removes a debounce race, and makes Phase 6 offline nearly
// free. The bbox indexes remain as the migration path.
//
// Visits are joined rather than fetched per place, because the pin colour
// depends on the average rating - a pin has to say how good somewhere is, not
// just whether it has been visited.
export async function getPlaces(): Promise<PlaceMarker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("places")
    .select(
      "id, name, lat, lng, status, category, cuisine, google_place_id, visits(rating)",
    )
    .order("created_at", { ascending: false })

  if (error) {
    // Surfaced rather than swallowed: an empty map and a broken map look
    // identical to the user, and only one is worth investigating.
    throw new Error(`Failed to load places: ${error.message}`)
  }

  type Row = Omit<PlaceMarker, "avg_rating" | "visit_count"> & {
    visits: { rating: number | null }[] | null
  }

  return ((data ?? []) as Row[]).map((row) => {
    const visits = row.visits ?? []
    const rated = visits.filter((v) => v.rating != null)
    const { visits: _discard, ...place } = row
    void _discard
    return {
      ...place,
      visit_count: visits.length,
      avg_rating: rated.length
        ? rated.reduce((sum, v) => sum + Number(v.rating), 0) / rated.length
        : null,
    }
  })
}
