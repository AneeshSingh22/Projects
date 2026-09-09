// Hand-written to match supabase/schema.sql. Kept small and explicit rather
// than generated: the schema is stable, and a generated file is one more thing
// that can silently drift from what is actually deployed.

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
  "id" | "name" | "lat" | "lng" | "status" | "cuisine" | "google_place_id"
>
