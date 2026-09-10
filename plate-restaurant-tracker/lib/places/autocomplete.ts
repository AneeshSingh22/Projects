"use client"

import { beginSession, endSession, currentSession } from "./session"

// Places API (New). HANDOFF 5a item 3.
//
// google.maps.places.Autocomplete - the drop-in widget nearly every tutorial
// shows - was deprecated in March 2025, and this project only has Places API
// (New) enabled, so the legacy path would fail outright. The current path is
// AutocompleteSuggestion.fetchAutocompleteSuggestions() to search, then
// place.fetchFields() to retrieve details.
//
// fetchFields is also where section 6's field mask is actually enforced, which
// is the difference between the Essentials SKU (10,000/month) and Enterprise
// (1,000/month, and the one realistic way to get billed).

export type Suggestion = {
  placeId: string
  primary: string
  secondary: string
}

// Biases results toward DC without restricting to it - travel still works.
const BIAS_CENTER = { lat: 38.9126, lng: -77.0219 }
const BIAS_RADIUS_M = 30_000

export async function fetchSuggestions(input: string): Promise<Suggestion[]> {
  const trimmed = input.trim()
  if (!trimmed) return []

  const { AutocompleteSuggestion } = (await google.maps.importLibrary(
    "places",
  )) as google.maps.PlacesLibrary

  const token = beginSession()

  const { suggestions } =
    await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: token ?? undefined,
      locationBias: {
        center: BIAS_CENTER,
        radius: BIAS_RADIUS_M,
      },
      // Restaurants and food places only. Narrowing here means fewer irrelevant
      // results, not a different SKU.
      includedPrimaryTypes: ["restaurant", "cafe", "bar", "bakery"],
    })

  return (suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is google.maps.places.PlacePrediction => p != null)
    .map((p) => ({
      placeId: p.placeId,
      primary: p.mainText?.text ?? p.text.text,
      secondary: p.secondaryText?.text ?? "",
    }))
}

export type PlaceDetails = {
  googlePlaceId: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  lat: number
  lng: number
  primaryType: string | null
}

// Closes the autocomplete session. Every field here is Essentials tier.
//
// Never add photos, reviews, rating or editorialSummary - section 6. Those
// promote the whole request to Enterprise.
export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  const { Place } = (await google.maps.importLibrary(
    "places",
  )) as google.maps.PlacesLibrary

  const place = new Place({ id: placeId })

  try {
    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "types",
        "primaryType",
        "addressComponents",
      ],
      // Passing the session token here is what makes every autocomplete
      // keystroke in this session bill at zero.
      ...(currentSession() ? { sessionToken: currentSession()! } : {}),
    } as google.maps.places.FetchFieldsRequest)
  } finally {
    // Single-use. Destroyed whether or not the call succeeded, because a token
    // that has been sent is spent either way.
    endSession()
  }

  const loc = place.location
  if (!loc) return null

  const component = (type: string) =>
    place.addressComponents?.find((c) => c.types.includes(type))?.longText ??
    null

  return {
    googlePlaceId: place.id,
    name: place.displayName ?? "Unnamed place",
    address: place.formattedAddress ?? null,
    city: component("locality") ?? component("sublocality") ?? null,
    country: component("country"),
    lat: loc.lat(),
    lng: loc.lng(),
    primaryType: place.primaryType ?? null,
  }
}
