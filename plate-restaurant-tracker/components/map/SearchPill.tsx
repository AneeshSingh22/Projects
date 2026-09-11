"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Search, Loader2, X } from "lucide-react"
import {
  fetchSuggestions,
  fetchPlaceDetails,
  type Suggestion,
} from "@/lib/places/autocomplete"
import { beginSession } from "@/lib/places/session"
import { addPlace } from "@/app/actions/places"
import type { PlaceMarker } from "@/types/db"

// Floating search pill - plan.md section 8. A sibling of <Map>, never a
// wrapper: this component re-renders on every keystroke, and anything wrapping
// the map would rebuild it each time.
export function SearchPill({
  onAdded,
}: {
  onAdded: (place: PlaceMarker, alreadyExisted: boolean) => void
}) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Guards against out-of-order responses: a slow request for "dai" must not
  // overwrite results for the later "daikaya".
  const seq = useRef(0)

  // Flipping the spinner on in a microtask rather than synchronously in the
  // effect body: same visible behaviour, no cascading render.
  const setSearchingAsync = (mine: number) => {
    queueMicrotask(() => {
      if (mine === seq.current) setSearching(true)
    })
  }

  const q = query.trim()
  const tooShort = q.length < 2

  useEffect(() => {
    // Nothing to search yet. Returning early without touching state keeps this
    // effect free of synchronous setState, which would cause a cascading render
    // on every keystroke - costly here because this component sits beside the
    // map and re-renders constantly.
    if (tooShort) return

    const mine = ++seq.current
    setSearchingAsync(mine)

    // Debounced at 250ms. This is the cost control that matters most in this
    // component: without it, every keystroke is an autocomplete request. They
    // bill at zero inside a session token, but the per-minute quota is real.
    const t = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(q)
        if (mine !== seq.current) return
        setSuggestions(results)
        setError(null)
      } catch (e) {
        if (mine !== seq.current) return
        setSuggestions([])
        setError(e instanceof Error ? e.message : "Search failed.")
      } finally {
        if (mine === seq.current) setSearching(false)
      }
    }, 250)

    return () => clearTimeout(t)
    // q and tooShort are both derived from query, so query alone would be
    // sufficient - but listing what the effect actually reads keeps this honest
    // if the derivation ever changes.
  }, [q, tooShort])

  function choose(s: Suggestion) {
    startTransition(async () => {
      setError(null)
      const details = await fetchPlaceDetails(s.placeId)
      if (!details) {
        setError("Could not read that place.")
        return
      }

      const result = await addPlace({
        googlePlaceId: details.googlePlaceId,
        name: details.name,
        address: details.address,
        city: details.city,
        country: details.country,
        lat: details.lat,
        lng: details.lng,
        cuisine: details.primaryType,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      onAdded(result.place, result.alreadyExisted)
      setQuery("")
      setSuggestions([])
      setOpen(false)
    })
  }

  // Derived, not stored: with a short query there is nothing to show, so there
  // is no need for an effect to clear state.
  const visibleSuggestions = tooShort ? [] : suggestions
  const busy = (searching && !tooShort) || pending

  return (
    <div className="pointer-events-auto w-full">
      <div className="bg-surface/90 border-line flex items-center gap-2 rounded-full border px-4 py-3 shadow-lg backdrop-blur-md">
        {busy ? (
          <Loader2 className="text-text-dim h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Search className="text-text-dim h-4 w-4 shrink-0" />
        )}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          // Allocating the session token on focus, per section 6.
          onFocus={() => {
            beginSession()
            setOpen(true)
          }}
          placeholder="Search a place"
          className="text-text placeholder:text-text-dim w-full bg-transparent text-base outline-none"
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setSuggestions([])
            }}
            className="text-text-dim hover:text-text shrink-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (visibleSuggestions.length > 0 || error) && (
        <ul className="bg-surface/95 border-line mt-2 overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md">
          {error && <li className="text-r-good px-4 py-3 text-sm">{error}</li>}
          {visibleSuggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => choose(s)}
                disabled={pending}
                className="hover:bg-surface-raised border-line block w-full border-b px-4 py-3 text-left last:border-b-0 disabled:opacity-50"
              >
                <span className="text-text block text-sm">{s.primary}</span>
                {s.secondary && (
                  <span className="text-text-dim block text-xs">
                    {s.secondary}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
