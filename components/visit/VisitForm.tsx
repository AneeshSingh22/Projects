"use client"

import { useState, useTransition } from "react"
import { RatingSlider } from "./RatingSlider"
import { logVisit, updateVisit, type VisitInput } from "@/app/actions/visits"
import type { Visit } from "@/types/db"

function todayISO(): string {
  // Local date, not UTC. toISOString() would roll over to tomorrow for anyone
  // logging a late dinner east of UTC, and to yesterday out west.
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

// Splits "ramen, gyoza" into ["ramen","gyoza"]. Stored as a Postgres text[]
// rather than a comma string so it stays queryable later.
function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

const field =
  "bg-surface-raised border-line text-text placeholder:text-text-dim w-full rounded-xl border px-3 py-2.5 text-base outline-none"

// The manual form. plan.md section 9, Phase 5 is explicit that this stays fully
// functional and always reachable - the LLM there only pre-fills these fields
// and never replaces this.
export function VisitForm({
  placeId,
  existing,
  onSaved,
  onCancel,
}: {
  placeId: string
  existing?: Visit
  onSaved: () => void
  onCancel: () => void
}) {
  const [visitedOn, setVisitedOn] = useState(existing?.visited_on ?? todayISO())
  const [rating, setRating] = useState<number | null>(
    existing?.rating != null ? Number(existing.rating) : 8,
  )
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [dishes, setDishes] = useState((existing?.dishes ?? []).join(", "))
  const [companions, setCompanions] = useState(
    (existing?.companions ?? []).join(", "),
  )
  const [price, setPrice] = useState(
    existing?.price_paid != null ? String(existing.price_paid) : "",
  )
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(
    existing?.would_return ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    const input: VisitInput = {
      placeId,
      visitedOn,
      rating,
      notes: notes.trim() || null,
      dishes: splitList(dishes),
      companions: splitList(companions),
      pricePaid: price.trim() ? Number(price) : null,
      wouldReturn,
      occasion: null,
    }

    if (input.pricePaid != null && Number.isNaN(input.pricePaid)) {
      setError("Price must be a number.")
      return
    }

    startTransition(async () => {
      const result = existing
        ? await updateVisit(existing.id, input)
        : await logVisit(input)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="space-y-4">
      <RatingSlider value={rating} onChange={setRating} />

      <div>
        <label htmlFor="visited-on" className="text-text-dim text-sm">
          Date
        </label>
        <input
          id="visited-on"
          type="date"
          value={visitedOn}
          onChange={(e) => setVisitedOn(e.target.value)}
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label htmlFor="dishes" className="text-text-dim text-sm">
          Dishes
        </label>
        <input
          id="dishes"
          value={dishes}
          onChange={(e) => setDishes(e.target.value)}
          placeholder="tonkotsu, gyoza"
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label htmlFor="companions" className="text-text-dim text-sm">
          With
        </label>
        <input
          id="companions"
          value={companions}
          onChange={(e) => setCompanions(e.target.value)}
          placeholder="Sarah"
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <label htmlFor="price" className="text-text-dim text-sm">
          Price
        </label>
        <input
          id="price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="22"
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <span className="text-text-dim text-sm">Would return?</span>
        <div className="mt-1 flex gap-2">
          {[
            { label: "Yes", v: true },
            { label: "No", v: false },
            { label: "Unsure", v: null },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setWouldReturn(o.v)}
              className={`border-line flex-1 rounded-full border px-3 py-2 text-sm transition-colors ${
                wouldReturn === o.v
                  ? "bg-surface-raised text-text"
                  : "text-text-dim"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="text-text-dim text-sm">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What was it like?"
          className={`${field} mt-1 resize-none`}
        />
      </div>

      {error && <p className="text-r-good text-sm">{error}</p>}

      <div className="flex gap-2 pb-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="bg-r-good text-text flex-1 rounded-full px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save changes" : "Log visit"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-line text-text-dim hover:text-text rounded-full border px-4 py-3 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
