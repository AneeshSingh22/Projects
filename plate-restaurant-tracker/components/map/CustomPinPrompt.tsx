"use client"

import { useState, useTransition } from "react"
import { addPlace } from "@/app/actions/places"
import type { PlaceMarker } from "@/types/db"

export type PinCandidate = { lat: number; lng: number }

// Long-press to drop a pin Google does not know about - plan.md section 9,
// Phase 2. Stored with google_place_id null.
//
// This is why the schema's unique constraint is on (user_id, google_place_id)
// rather than on name: Postgres treats NULLs as distinct in a unique index, so
// any number of manual pins coexist while Google-sourced places stay unique.
export function CustomPinPrompt({
  candidate,
  onAdded,
  onDismiss,
}: {
  candidate: PinCandidate
  onAdded: (place: PlaceMarker, alreadyExisted: boolean, thenLog?: boolean) => void
  onDismiss: () => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(thenLog: boolean) {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Give it a name.")
      return
    }
    startTransition(async () => {
      const result = await addPlace({
        googlePlaceId: null,
        name: trimmed,
        lat: candidate.lat,
        lng: candidate.lng,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onAdded(result.place, result.alreadyExisted, thenLog)
      onDismiss()
    })
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 p-4">
      <div className="bg-surface border-line mx-auto max-w-md rounded-2xl border p-4 shadow-2xl">
        <p className="text-text-dim text-xs">
          Dropped at {candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}
        </p>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save(true)
          }}
          autoFocus
          placeholder="What is this place called?"
          className="bg-surface-raised border-line text-text placeholder:text-text-dim mt-3 w-full rounded-xl border px-3 py-2.5 text-base outline-none"
        />
        {error && <p className="text-r-good mt-2 text-sm">{error}</p>}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="bg-r-good text-text w-full rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {/* A hand-dropped pin has no Google type to categorise from, so
                this stays generic rather than guessing wrong. */}
            {pending ? "Saving…" : "Log a visit here"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={pending}
              className="border-line text-text hover:bg-surface-raised flex-1 rounded-full border px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Add to wishlist
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="border-line text-text-dim hover:text-text rounded-full border px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
