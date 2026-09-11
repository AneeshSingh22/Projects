"use client"

import { useEffect, useState, useTransition } from "react"
import { fetchPlaceDetails } from "@/lib/places/autocomplete"
import { addPlace } from "@/app/actions/places"
import type { PlaceMarker } from "@/types/db"
import { CATEGORIES, categoryFromGoogleType } from "@/lib/categories"

export type PoiCandidate = { placeId: string; lat: number; lng: number }

// Tapping a restaurant label already drawn on Google's base map, then adding it
// without typing (plan.md section 9, Phase 2).
//
// Cost note: this fires one Place Details call per tap, on the Essentials SKU
// (10,000/month against an expected ~10). It deliberately does NOT run any
// nearby or text search - section 6 forbids those outright.
export function PoiPrompt({
  candidate,
  onAdded,
  onDismiss,
}: {
  candidate: PoiCandidate
  onAdded: (place: PlaceMarker, alreadyExisted: boolean, thenLog?: boolean) => void
  onDismiss: () => void
}) {
  const [details, setDetails] = useState<{
    placeId: string
    name: string
    address: string | null
    primaryType: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    // Details are keyed by placeId in state rather than cleared synchronously
    // here, so this effect never calls setState in its body. Same visible
    // behaviour - a new POI shows "Loading..." until its own details land.
    fetchPlaceDetails(candidate.placeId)
      .then((d) => {
        if (cancelled) return
        if (!d) {
          setError("Could not read that place.")
          return
        }
        setDetails({
          placeId: candidate.placeId,
          name: d.name,
          address: d.address,
          primaryType: d.primaryType,
        })
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed.")
      })

    return () => {
      cancelled = true
    }
  }, [candidate.placeId])

  // thenLog carries the user's intent through the add. Tapping a restaurant on
  // the map and then having to find its pin again to record the meal was a
  // dead end - "I just ate here" is the most likely reason to tap a place at
  // all, so it gets its own button rather than being a second step.
  function add(thenLog: boolean) {
    startTransition(async () => {
      const d = await fetchPlaceDetails(candidate.placeId)
      if (!d) {
        setError("Could not read that place.")
        return
      }
      const result = await addPlace({
        googlePlaceId: d.googlePlaceId,
        name: d.name,
        address: d.address,
        city: d.city,
        country: d.country,
        lat: d.lat,
        lng: d.lng,
        cuisine: d.primaryType,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onAdded(result.place, result.alreadyExisted, thenLog)
      onDismiss()
    })
  }

  // Only trust details that belong to the POI currently being shown.
  const current = details?.placeId === candidate.placeId ? details : null
  const name = current?.name ?? null
  const address = current?.address ?? null

  // The category is already known here, so the action can say the right thing
  // rather than something generic. "I ate here" on a rec centre reads as a bug.
  const category = categoryFromGoogleType(current?.primaryType)
  const meta = CATEGORIES[category]

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 p-4">
      <div className="bg-surface border-line mx-auto max-w-md rounded-2xl border p-4 shadow-2xl">
        {error ? (
          <p className="text-r-good text-sm">{error}</p>
        ) : (
          <>
            <p className="font-display text-text text-lg leading-tight">
              {name ?? "Loading…"}
            </p>
            {address && (
              <p className="text-text-dim mt-0.5 text-xs">{address}</p>
            )}
          </>
        )}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={pending || !name}
            className="bg-r-good text-text w-full rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Adding…" : `${meta.visitedVerb} — log a visit`}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => add(false)}
              disabled={pending || !name}
              className="border-line text-text hover:bg-surface-raised flex-1 rounded-full border px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Add to wishlist
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="border-line text-text-dim hover:text-text rounded-full border px-4 py-2.5 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
