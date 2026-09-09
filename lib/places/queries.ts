import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { PlaceMarker } from "@/types/db"

// Every place, in one query, with no viewport filter.
//
// This is a deliberate departure from plan.md section 9, which specified a
// bounding-box query on lat/lng debounced at 300ms per pan. See HANDOFF 5a
// item 1.
//
// Reasoning: one person's restaurant list is well under 100KB of JSON. Fetching
// it once and filtering in memory removes a network round trip from every pan,
// removes a debounce race where a fast pan can land results out of order, and
// makes the Phase 6 offline requirement nearly free - the data is already all
// in the client.
//
// The bbox indexes in schema.sql are kept as the migration path. The real
// ceiling here is not this query but marker rendering, which degrades somewhere
// past a thousand pins; that is when clustering arrives, not a viewport query.
export async function getPlaces(): Promise<PlaceMarker[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("places")
    .select("id, name, lat, lng, status, cuisine, google_place_id")
    .order("created_at", { ascending: false })

  if (error) {
    // Surfaced rather than swallowed: an empty map and a broken map look
    // identical to the user, and only one of them is worth investigating.
    throw new Error(`Failed to load places: ${error.message}`)
  }

  return data ?? []
}
