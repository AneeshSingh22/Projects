"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, X } from "lucide-react"
import { CATEGORIES, CATEGORY_ORDER, type PlaceCategory } from "@/lib/categories"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// The places panel, top-right.
//
// One interaction, not two. The previous version had a category row that opened
// a list AND a separate 36px column with a cryptic glyph that filtered the map -
// two controls doing adjacent things, and the filtering one was effectively
// undiscoverable.
//
// Now tapping a category does both: it filters the map to that category and
// shows the list of those places. Closing the panel, or tapping "All places",
// restores everything. The filter can never outlive the panel, which is what
// made the old one feel buggy - the map could stay filtered with no visible
// indication of why.
export function CategoryPanel({
  places,
  activeFilter,
  onFilterChange,
  onSelectPlace,
}: {
  places: PlaceMarker[]
  activeFilter: PlaceCategory | null
  onFilterChange: (c: PlaceCategory | null) => void
  onSelectPlace: (place: PlaceMarker) => void
}) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const out = {} as Record<PlaceCategory, PlaceMarker[]>
    for (const c of CATEGORY_ORDER) out[c] = []
    for (const p of places) (out[p.category] ??= []).push(p)
    // Best first: the list answers "where was good?" more often than "what did
    // I add most recently".
    for (const c of CATEGORY_ORDER) {
      out[c].sort((a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1))
    }
    return out
  }, [places])

  // Closing the panel always clears the filter. A hidden filter that survives
  // the UI that set it is the definition of a confusing state.
  function close() {
    setOpen(false)
    onFilterChange(null)
  }

  // If the panel is somehow unmounted while a filter is active, clear it too.
  useEffect(() => {
    if (!open && activeFilter) onFilterChange(null)
    // Intentionally only reacting to `open`; adding the others would clear the
    // filter the moment it is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const total = places.length

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface/95 border-line text-text hover:border-line-strong pointer-events-auto rounded-full border px-4 py-3 text-sm backdrop-blur-xl transition-all sm:px-6 sm:py-4 sm:text-base"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        {total} place{total === 1 ? "" : "s"}
      </button>
    )
  }

  const list = activeFilter ? grouped[activeFilter] : null

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto w-72 overflow-hidden rounded-2xl border backdrop-blur-xl duration-200 animate-in fade-in slide-in-from-top-2"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        {activeFilter ? (
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className="text-text hover:text-text flex items-center gap-1.5 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            All places
          </button>
        ) : (
          <span className="text-text-dim text-xs">Filter by kind</span>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* While filtered, say so plainly. The map is hiding pins, and the user
          needs to know that is deliberate and how to undo it. */}
      {activeFilter && (
        <p className="bg-accent/10 text-text border-line border-b px-4 py-2 text-xs">
          Showing {grouped[activeFilter].length}{" "}
          {CATEGORIES[activeFilter].label.toLowerCase()} on the map
        </p>
      )}

      <div className="max-h-[55dvh] overflow-y-auto overscroll-contain">
        {list ? (
          list.length === 0 ? (
            <p className="text-text-dim px-4 py-4 text-xs">
              Nothing in this category yet.
            </p>
          ) : (
            <ul>
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(p)}
                    className="hover:bg-surface-raised border-line flex w-full items-center justify-between gap-2 border-b px-4 py-3 text-left transition-colors last:border-b-0"
                  >
                    <span className="text-text truncate text-sm">{p.name}</span>
                    <span
                      className="font-display shrink-0 text-sm tabular-nums"
                      style={{
                        color:
                          p.avg_rating == null
                            ? RATING_NONE
                            : ratingColor(p.avg_rating),
                      }}
                    >
                      {p.avg_rating == null ? "–" : formatRating(p.avg_rating)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul>
            {CATEGORY_ORDER.map((c) => {
              const Icon = CATEGORIES[c].icon
              const count = grouped[c].length
              return (
                <li key={c}>
                  <button
                    type="button"
                    // One tap does both jobs: filter the map, show the list.
                    onClick={() => onFilterChange(c)}
                    disabled={count === 0}
                    className="hover:bg-surface-raised border-line flex w-full items-center gap-2.5 border-b px-4 py-3 text-left transition-colors last:border-b-0 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Icon className="text-text-dim h-4 w-4 shrink-0" />
                    <span className="text-text flex-1 truncate text-sm">
                      {CATEGORIES[c].label}
                    </span>
                    <span className="text-text-dim text-sm tabular-nums">
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!activeFilter && (
        <p className="border-line text-text-dim border-t px-4 py-2 text-[11px] leading-relaxed">
          Tap a kind to show only those on the map.
        </p>
      )}
    </div>
  )
}
