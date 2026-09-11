"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, X } from "lucide-react"
import { CATEGORIES, CATEGORY_ORDER, type PlaceCategory } from "@/lib/categories"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

// The counts panel, top-right. Two states: a compact list of categories with
// counts, and an expanded list of the places inside one category.
//
// Built from the places already in memory rather than a new query. Everything
// is loaded once at startup, so counting and grouping here costs nothing and
// stays correct the instant a place is added or deleted.
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
  const [expanded, setExpanded] = useState<PlaceCategory | null>(null)

  const grouped = useMemo(() => {
    const out = {} as Record<PlaceCategory, PlaceMarker[]>
    for (const c of CATEGORY_ORDER) out[c] = []
    for (const p of places) (out[p.category] ??= []).push(p)
    // Best first within a category: the list answers "where was good?" more
    // often than "what did I add most recently".
    for (const c of CATEGORY_ORDER) {
      out[c].sort((a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1))
    }
    return out
  }, [places])

  const total = places.length

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface/95 border-line text-text hover:border-line-strong pointer-events-auto rounded-full border px-5 py-3.5 text-sm backdrop-blur-xl transition-all"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        {total} place{total === 1 ? "" : "s"}
      </button>
    )
  }

  const list = expanded ? grouped[expanded] : null

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto w-64 overflow-hidden rounded-2xl border backdrop-blur-xl duration-200 animate-in fade-in slide-in-from-top-2"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <div className="border-line flex items-center justify-between border-b px-3 py-2">
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="text-text-dim hover:text-text flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {CATEGORIES[expanded].label}
          </button>
        ) : (
          <span className="text-text-dim text-xs">Where you have been</span>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setExpanded(null)
          }}
          aria-label="Close"
          className="text-text-dim hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[50dvh] overflow-y-auto overscroll-contain">
        {list ? (
          list.length === 0 ? (
            <p className="text-text-dim px-3 py-4 text-xs">Nothing here yet.</p>
          ) : (
            <ul>
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(p)}
                    className="hover:bg-surface-raised border-line flex w-full items-center justify-between gap-2 border-b px-3.5 py-3 text-left transition-colors last:border-b-0"
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
              const isFiltered = activeFilter === c
              return (
                <li key={c} className="border-line border-b last:border-b-0">
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setExpanded(c)}
                      className="hover:bg-surface-raised flex flex-1 items-center gap-2.5 px-3.5 py-3 text-left transition-colors"
                    >
                      <Icon className="text-text-dim h-4 w-4 shrink-0" />
                      <span className="text-text flex-1 truncate text-sm">
                        {CATEGORIES[c].label}
                      </span>
                      <span className="text-text-dim text-sm tabular-nums">
                        {count}
                      </span>
                    </button>
                    {/* Filtering the map is a separate action from browsing the
                        list, so it gets its own target rather than overloading
                        the row. */}
                    <button
                      type="button"
                      onClick={() => onFilterChange(isFiltered ? null : c)}
                      aria-label={
                        isFiltered
                          ? `Show all categories`
                          : `Show only ${CATEGORIES[c].label} on the map`
                      }
                      className={`border-line w-9 shrink-0 border-l text-xs ${
                        isFiltered
                          ? "bg-surface-raised text-text"
                          : "text-text-dim hover:text-text"
                      }`}
                    >
                      {isFiltered ? "on" : "◎"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeFilter && !expanded && (
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className="border-line text-text-dim hover:text-text w-full border-t px-3 py-2 text-xs"
        >
          Clear filter
        </button>
      )}
    </div>
  )
}
