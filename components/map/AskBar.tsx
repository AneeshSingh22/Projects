"use client"

import { useState } from "react"
import { Sparkles, Loader2, X, MapPin } from "lucide-react"
import { getSearchablePlaces } from "@/app/actions/search"
import { applyFilters, type SearchResult } from "@/lib/search/apply"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// Natural language querying - plan.md section 11's "later phase".
//
// The model translates the question into filters; the filtering happens here,
// against data the model never sees. A bad parse therefore produces results
// that are wrong but explainable, never invented places.
export function AskBar({
  onResults,
  onClear,
  onSelectPlace,
}: {
  onResults: (ids: string[]) => void
  onClear: () => void
  onSelectPlace: (place: PlaceMarker) => void
}) {
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function ask() {
    const q = question.trim()
    if (!q) return

    setBusy(true)
    setError(null)

    try {
      // Location is requested only when asked for, and only in response to a
      // deliberate action. Asked for up front it reads as surveillance.
      const wantsNearby = /\b(near|nearby|around here|close|walking)\b/i.test(q)
      const origin = wantsNearby ? await currentPosition() : null

      const [res, places] = await Promise.all([
        fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        }).then((r) => r.json()),
        getSearchablePlaces(),
      ])

      if (!res?.ok) {
        setError("Could not read that question. Try simpler wording.")
        setResults(null)
        return
      }

      const found = applyFilters(places, res.filters, origin)
      setResults(found)
      setSummary(res.filters.summary ?? null)
      onResults(found.map((r) => r.place.id))
    } catch {
      setError("Something went wrong. Try again.")
      setResults(null)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setQuestion("")
    setResults(null)
    setSummary(null)
    setError(null)
    onClear()
  }

  return (
    <div className="pointer-events-auto w-full">
      <div className="bg-surface/90 border-line flex items-center gap-2 rounded-full border px-4 py-3 shadow-lg backdrop-blur-md">
        {busy ? (
          <Loader2 className="text-text-dim h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Sparkles className="text-text-dim h-4 w-4 shrink-0" />
        )}
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask()
          }}
          placeholder="Ask about your places"
          className="text-text placeholder:text-text-dim w-full bg-transparent text-base outline-none"
          enterKeyHint="search"
        />
        {(question || results) && (
          <button
            type="button"
            onClick={reset}
            aria-label="Clear"
            className="text-text-dim hover:text-text shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(summary || error || results) && (
        <div className="bg-surface/95 border-line mt-2 overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md">
          {error ? (
            <p className="text-r-low px-4 py-3 text-sm">{error}</p>
          ) : (
            <>
              {summary && (
                <p className="text-text-dim border-line border-b px-4 py-2 text-xs">
                  {summary}
                  {results && ` — ${results.length} match${results.length === 1 ? "" : "es"}`}
                </p>
              )}
              {results && results.length === 0 && (
                <p className="text-text-dim px-4 py-3 text-sm">
                  Nothing matches yet.
                </p>
              )}
              {results && results.length > 0 && (
                <ul className="max-h-[40dvh] overflow-y-auto overscroll-contain">
                  {results.map(({ place, distanceKm }) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => onSelectPlace(place)}
                        className="hover:bg-surface-raised border-line flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left last:border-b-0"
                      >
                        <span className="min-w-0">
                          <span className="text-text block truncate text-sm">
                            {place.name}
                          </span>
                          {distanceKm != null && (
                            <span className="text-text-dim flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              {distanceKm < 1
                                ? `${Math.round(distanceKm * 1000)} m`
                                : `${distanceKm.toFixed(1)} km`}
                            </span>
                          )}
                        </span>
                        <span
                          className="font-display shrink-0 text-sm tabular-nums"
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
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Wrapped because the browser API is callback-based and rejects loudly when
// permission is denied. A refusal should quietly drop the distance sorting, not
// fail the whole question.
function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 60_000 },
    )
  })
}
