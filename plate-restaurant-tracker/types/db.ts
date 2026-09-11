// Hand-written to match supabase/schema.sql. Kept small and explicit rather
// than generated: the schema is stable, and a generated file is one more thing
// that can silently drift from what is actually deployed.

import type { PlaceCategory } from "@/lib/categories"

export type PlaceStatus = "want_to_try" | "visited" | "favorite" | "avoid"

export type Place = {
  id: string
  user_id: string
  google_place_id: string | null
  name: string
  address: string | null
  city: string | null
  country: string | null
  lat: number
  lng: number
  status: PlaceStatus
  category: PlaceCategory
  cuisine: string | null
  price_level: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// What the client actually needs to draw a pin and open a sheet. Deliberately
// narrower than Place so the "fetch everything once" query in lib/places stays
// honest about its payload size.
export type PlaceMarker = Pick<
  Place,
  | "id"
  | "name"
  | "lat"
  | "lng"
  | "status"
  | "category"
  | "cuisine"
  | "google_place_id"
> & {
  // Carried on the marker so a pin can be coloured by how good the place is
  // rather than merely whether it has been visited. Computed in the query, not
  // stored on the row - section 7 keeps derived values out of the table.
  avg_rating: number | null
  visit_count: number
}

export type Visit = {
  id: string
  place_id: string
  user_id: string
  visited_on: string
  rating: number | null
  notes: string | null
  dishes: string[] | null
  activity: string[] | null
  companions: string[] | null
  price_paid: number | null
  would_return: boolean | null
  occasion: string | null
  created_at: string
}

// A place plus the derived values the sheet shows. Section 7 is explicit that
// these are computed rather than denormalised onto places until there is a
// measured reason.
export type PlaceDetail = PlaceMarker & {
  address: string | null
  city: string | null
  notes: string | null
  visits: Visit[]
  visitCount: number
  avgRating: number | null
  lastVisitedOn: string | null
}

export type Deal = {
  id: string
  place_id: string
  user_id: string
  description: string
  days: number[] | null
  starts_at: string | null
  ends_at: string | null
  expires_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// A deal joined to enough of its place to render a row without a second query.
export type DealWithPlace = Deal & {
  place: Pick<Place, "id" | "name" | "lat" | "lng" | "category">
}
