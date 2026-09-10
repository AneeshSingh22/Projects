"use server"

import { getPlaces as query } from "@/lib/places/queries"
import type { PlaceMarker } from "@/types/db"

// Client-callable wrapper around the server-only places query, so the map can
// re-read pins after a visit changes a place's status without a full reload.
export async function getPlaces(): Promise<PlaceMarker[]> {
  return query()
}
