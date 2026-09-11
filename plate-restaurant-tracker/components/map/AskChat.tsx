"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X, ArrowUp, MapPin, Loader2 } from "lucide-react"
import { getSearchablePlaces } from "@/app/actions/search"
import { applyFilters, type SearchResult } from "@/lib/search/apply"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import { CATEGORIES } from "@/lib/categories"
import type { PlaceMarker } from "@/types/db"

type Turn =
  | { role: "you"; text: string }
  | { role: "app"; summary: string; results: SearchResult[] }
  | { role: "app"; error: string }

// Example questions, shown only on an empty conversation. A blank chat box is
// an invitation to guess wrong; three concrete examples teach the shape of what
// works in less time than any explanation.
const EXAMPLES = [
  "cheap food I liked near here",
  "places I want to try",
  "where did I go with Rish",
]

export function AskChat({
  onResults,
  onClear,
  onSelectPlace,
  onFlyTo,
}: {
  onResults: (ids: string[]) => void
  onClear: () => void
  onSelectPlace: (place: PlaceMarker) => void
  onFlyTo: (place: PlaceMarker) => void
}) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, busy])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return

    setTurns((t) => [...t, { role: "you", text: q }])
    setDraft("")
    setBusy(true)

    try {
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
        setTurns((t) => [
          ...t,
          { role: "app", error: "I could not read that. Try simpler wording." },
        ])
        return
      }

      const found = applyFilters(places, res.filters, origin)
      setTurns((t) => [
        ...t,
        { role: "app", summary: res.filters.summary ?? "Here is what I found", results: found },
      ])
      onResults(found.map((r) => r.place.id))

      // Exactly one answer means the question was really "take me there".
      // Flying to it and opening its sheet is the whole point - making the user
      // then hunt for the pin would waste the precision.
      if (found.length === 1) onFlyTo(found[0].place)
    } catch {
      setTurns((t) => [
        ...t,
        { role: "app", error: "Something went wrong. Try again." },
      ])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask about your places"
        className="bg-accent hover:bg-accent-hover pointer-events-auto flex h-[86px] w-[86px] items-center justify-center rounded-full text-white transition-all duration-200 ease-out active:scale-95"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <Sparkles className="h-8 w-8" />
      </button>
    )
  }

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto flex h-[70dvh] max-h-[560px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border backdrop-blur-2xl duration-300 ease-out animate-in fade-in slide-in-from-bottom-6"
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      <header className="border-line flex shrink-0 items-center justify-between border-b px-4 py-3.5">
        <span className="flex items-center gap-2.5">
          <span className="bg-accent/10 text-accent grid h-7 w-7 place-items-center rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-text text-base leading-none">Ask</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setTurns([])
            onClear()
          }}
          aria-label="Close"
          className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {turns.length === 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-text text-sm leading-relaxed">
              Ask about anywhere you have been, or anywhere you still want to go.
            </p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => ask(ex)}
                  className="border-line bg-surface-raised/60 text-text-dim hover:text-text hover:border-line-strong hover:bg-surface-raised rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all duration-150"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "you" ? (
            <div key={i} className="flex justify-end">
              <p className="bg-accent max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white">
                {turn.text}
              </p>
            </div>
          ) : "error" in turn ? (
            <p key={i} className="text-r-low text-sm">
              {turn.error}
            </p>
          ) : (
            <div key={i} className="space-y-2">
              <p className="text-text-dim text-xs">
                {turn.summary}
                {` — ${turn.results.length} ${turn.results.length === 1 ? "place" : "places"}`}
              </p>
              {turn.results.length === 0 ? (
                <p className="text-text-dim text-sm">
                  Nothing matches that yet.
                </p>
              ) : (
                <ul className="border-line bg-surface-raised/40 overflow-hidden rounded-xl border">
                  {turn.results.map(({ place, distanceKm }) => {
                    const Icon = CATEGORIES[place.category].icon
                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPlace(place)}
                          className="hover:bg-surface-raised border-line flex w-full items-center gap-3 border-b px-3.5 py-3 text-left last:border-b-0 transition-colors"
                        >
                          <Icon className="text-text-dim h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="text-text block truncate text-sm">
                              {place.name}
                            </span>
                            {distanceKm != null && (
                              <span className="text-text-dim flex items-center gap-1 text-[11px]">
                                <MapPin className="h-2.5 w-2.5" />
                                {distanceKm < 1
                                  ? `${Math.round(distanceKm * 1000)} m away`
                                  : `${distanceKm.toFixed(1)} km away`}
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
                    )
                  })}
                </ul>
              )}
            </div>
          ),
        )}

        {busy && (
          <div className="text-text-dim flex items-center gap-2 text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Looking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
        className="border-line bg-surface/80 flex shrink-0 items-center gap-2 border-t px-3.5 py-3 backdrop-blur-sm"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question"
          className="text-text placeholder:text-text-dim min-w-0 flex-1 bg-transparent text-base outline-none"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label="Send"
          className="bg-accent hover:bg-accent-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all duration-150 active:scale-90 disabled:opacity-25"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

// Wrapped because the browser API is callback-based and rejects loudly when
// permission is denied. A refusal should quietly drop distance sorting, not
// fail the question.
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
