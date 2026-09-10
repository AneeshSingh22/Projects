"use server"

import { createClient } from "@/lib/supabase/server"
import type { PlaceDetail, Visit } from "@/types/db"

// Loaded on demand when the sheet opens, rather than shipped with every place
// up front. Visit history is the bulky part of this data and most places are
// never opened in a given session.
//
// Derived values (average, count, last visited) are computed here rather than
// stored on the place row - section 7 is explicit about not denormalising them
// until there is a measured reason.
export async function getPlaceDetail(
  placeId: string,
): Promise<PlaceDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: place, error } = await supabase
    .from("places")
    .select(
      "id, name, lat, lng, status, cuisine, google_place_id, address, city, notes",
    )
    .eq("id", placeId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error || !place) return null

  const { data: visitRows } = await supabase
    .from("visits")
    .select("*")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false })

  const visits = (visitRows ?? []) as Visit[]
  const rated = visits.filter((v) => v.rating != null)

  return {
    ...place,
    visits,
    visitCount: visits.length,
    avgRating: rated.length
      ? rated.reduce((sum, v) => sum + Number(v.rating), 0) / rated.length
      : null,
    lastVisitedOn: visits[0]?.visited_on ?? null,
  } as PlaceDetail
}
