"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { PlaceMarker, PlaceStatus } from "@/types/db"

export type AddPlaceInput = {
  googlePlaceId: string | null
  name: string
  address?: string | null
  city?: string | null
  country?: string | null
  lat: number
  lng: number
  cuisine?: string | null
}

export type AddPlaceResult =
  | { ok: true; place: PlaceMarker; alreadyExisted: boolean }
  | { ok: false; error: string }

// Writes a place with status 'want_to_try' (plan.md section 9, Phase 2).
//
// Section 6's cache-write-once rule: once a place is here, Google is never
// asked about it again. The Google place_id is a permanent key and is safe to
// store indefinitely; every other field is a snapshot and is deliberately never
// refreshed.
export async function addPlace(input: AddPlaceInput): Promise<AddPlaceResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: "Not signed in." }

  const name = input.name.trim()
  if (!name) return { ok: false, error: "A place needs a name." }

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { ok: false, error: "That place has no usable location." }
  }

  // Adding something already on the map is a normal thing to do by accident,
  // especially via a map POI tap. Return the existing row instead of an error
  // so the UI can just select it.
  if (input.googlePlaceId) {
    const { data: existing } = await supabase
      .from("places")
      .select("id, name, lat, lng, status, cuisine, google_place_id")
      .eq("user_id", user.id)
      .eq("google_place_id", input.googlePlaceId)
      .maybeSingle()

    if (existing) {
      return { ok: true, place: existing as PlaceMarker, alreadyExisted: true }
    }
  }

  const { data, error } = await supabase
    .from("places")
    .insert({
      user_id: user.id,
      google_place_id: input.googlePlaceId,
      name,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      lat: input.lat,
      lng: input.lng,
      cuisine: input.cuisine ?? null,
      status: "want_to_try" satisfies PlaceStatus,
    })
    .select("id, name, lat, lng, status, cuisine, google_place_id")
    .single()

  if (error) {
    // 23505 is a unique-violation: the (user_id, google_place_id) constraint.
    // Reachable if two tabs add the same place at once, since the check above
    // is not atomic with the insert.
    if (error.code === "23505") {
      return { ok: false, error: "That place is already on your map." }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath("/")
  return { ok: true, place: data as PlaceMarker, alreadyExisted: false }
}
