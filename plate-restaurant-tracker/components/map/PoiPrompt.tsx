"use client"

import { useEffect, useState, useTransition } from "react"
import { fetchPlaceDetails } from "@/lib/places/autocomplete"
import { addPlace } from "@/app/actions/places"
import type { PlaceMarker } from "@/types/db"

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
  onAdded: (place: PlaceMarker, alreadyExisted: boolean) => void
  onDismiss: () => void
}) {
  const [details, setDetails] = useState<{
    placeId: string
    name: string
    address: string | null
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
        setDetails({ placeId: candidate.placeId, name: d.name, address: d.address })
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed.")
      })

    return () => {
      cancelled = true
    }
  }, [candidate.placeId])

  function add() {
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
      onAdded(result.place, result.alreadyExisted)
      onDismiss()
    })
  }

  // Only trust details that belong to the POI currently being shown.
  const current = details?.placeId === candidate.placeId ? details : null
  const name = current?.name ?? null
  const address = current?.address ?? null

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

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={add}
            disabled={pending || !name}
            className="bg-r-good text-text flex-1 rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add to wishlist"}
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
  )
}
