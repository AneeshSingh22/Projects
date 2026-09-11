"use client"

import { useState } from "react"
import { Compass, X, RefreshCw, MapPin, Loader2 } from "lucide-react"
import { getSearchablePlaces } from "@/app/actions/search"
import { getDeals } from "@/app/actions/deals"
import { suggest, type Suggestion } from "@/lib/suggest/score"
import { CATEGORIES } from "@/lib/categories"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// "What should I do right now?" - one tap, one answer, with its reasoning
// attached.
//
// The scoring is plain arithmetic in lib/suggest/score.ts rather than a model
// call. A recommendation you cannot explain is one you stop trusting, and this
// way every reason shown is the actual cause of the ranking rather than a
// justification invented afterwards. It is also instant and cannot fail.
export function WhatNow({
  onSelectPlace,
}: {
  onSelectPlace: (place: PlaceMarker) => void
}) {
  const [open, setOpen] = useState(false)
  const [picks, setPicks] = useState<Suggestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [noLocation, setNoLocation] = useState(false)

  async function run(fresh: boolean) {
    setBusy(true)
    try {
      const origin = await currentPosition()
      setNoLocation(origin == null)

      const [places, deals] = await Promise.all([
        getSearchablePlaces(),
        getDeals().catch(() => []),
      ])

      const exclude = fresh ? new Set<string>() : seen
      const found = suggest(places, deals, { now: new Date(), origin, exclude }, 3)

      // Everything has been offered already - start over rather than showing
      // an empty panel, which reads as broken.
      if (found.length === 0 && exclude.size > 0) {
        const restart = suggest(places, deals, { now: new Date(), origin }, 3)
        setSeen(new Set(restart.map((s) => s.place.id)))
        setPicks(restart)
      } else {
        setSeen((prev) => {
          const next = fresh ? new Set<string>() : new Set(prev)
          for (const s of found) next.add(s.place.id)
          return next
        })
        setPicks(found)
      }
    } catch {
      setPicks([])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          run(true)
        }}
        className="bg-surface/95 border-line text-text hover:border-line-strong pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-3 text-sm backdrop-blur-xl transition-all sm:gap-2.5 sm:px-6 sm:py-4 sm:text-base"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <Compass className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        What now
      </button>
    )
  }

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto w-[min(88vw,340px)] overflow-hidden rounded-2xl border backdrop-blur-xl duration-200 animate-in fade-in slide-in-from-bottom-3"
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <span className="flex items-center gap-2">
          <Compass className="text-text-dim h-4 w-4" />
          <span className="font-display text-text text-sm">What now</span>
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={busy}
            aria-label="Something else"
            className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </span>
      </div>

      <div className="max-h-[50dvh] overflow-y-auto overscroll-contain">
        {picks == null || (busy && picks.length === 0) ? (
          <p className="text-text-dim flex items-center gap-2 px-4 py-5 text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </p>
        ) : picks.length === 0 ? (
          <p className="text-text-dim px-4 py-5 text-sm">
            Nothing to suggest yet. Add a few places first.
          </p>
        ) : (
          <ul>
            {picks.map(({ place, reasons, distanceKm, activeDeal }, i) => {
              const Icon = CATEGORIES[place.category].icon
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place)}
                    className="hover:bg-surface-raised border-line w-full border-b px-4 py-3.5 text-left transition-colors last:border-b-0"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <Icon className="text-text-dim h-3.5 w-3.5 shrink-0" />
                          <span
                            className={`text-text truncate ${i === 0 ? "font-display text-base" : "text-sm"}`}
                          >
                            {place.name}
                          </span>
                        </span>
                        {/* The reasons ARE the score, not a post-hoc
                            explanation - see lib/suggest/score.ts. */}
                        <span className="text-text-dim mt-1 block text-xs leading-relaxed">
                          {reasons.join(" · ")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className="font-display text-sm tabular-nums"
                          style={{
                            color:
                              place.avg_rating == null
                                ? RATING_NONE
                                : ratingColor(place.avg_rating),
                          }}
                        >
                          {place.avg_rating == null
                            ? "–"
                            : formatRating(place.avg_rating)}
                        </span>
                        {activeDeal && (
                          <span className="bg-accent rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white">
                            deal
                          </span>
                        )}
                      </span>
                    </span>
                    {distanceKm != null && i === 0 && (
                      <span className="text-text-dim mt-1.5 flex items-center gap-1 text-[11px]">
                        <MapPin className="h-2.5 w-2.5" />
                        {distanceKm < 1
                          ? `${Math.round(distanceKm * 1000)} m away`
                          : `${distanceKm.toFixed(1)} km away`}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {noLocation && picks && picks.length > 0 && (
          <p className="text-text-dim border-line border-t px-4 py-2 text-[11px]">
            Location off, so distance is not being considered.
          </p>
        )}
      </div>
    </div>
  )
}

function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 120_000 },
    )
  })
}
