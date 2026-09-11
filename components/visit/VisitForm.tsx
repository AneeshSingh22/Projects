"use client"

import { useState, useTransition } from "react"
import { RatingSlider } from "./RatingSlider"
import { logVisit, updateVisit, type VisitInput } from "@/app/actions/visits"
import { QuickLog } from "./QuickLog"
import type { Visit } from "@/types/db"
import type { ParsedVisit } from "@/app/api/parse-visit/route"
import { CATEGORIES, type PlaceCategory } from "@/lib/categories"

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
  category,
  existing,
  onSaved,
  onCancel,
}: {
  placeId: string
  // Decides what the free-text detail field is called. Section 8 wants plain
  // language, and "Dishes" on a basketball court reads as a bug.
  category: PlaceCategory
  existing?: Visit
  onSaved: () => void
  onCancel: () => void
}) {
  const meta = CATEGORIES[category]
  const isFood = category === "food_drink"
  const [visitedOn, setVisitedOn] = useState(existing?.visited_on ?? todayISO())
  const [rating, setRating] = useState<number | null>(
    existing?.rating != null ? Number(existing.rating) : 8,
  )
  const [notes, setNotes] = useState(existing?.notes ?? "")
  // One input, two columns. Food keeps the original `dishes` column so nothing
  // already logged moves; other categories write to `activity`. Splitting the
  // storage rather than renaming means no migration touches existing rows.
  const [detail, setDetail] = useState(
    (
      (isFood ? existing?.dishes : existing?.activity) ?? []
    ).join(", "),
  )
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

  // The quick-log step is offered only for a NEW visit, never when editing -
  // re-parsing over fields the user already corrected would be hostile.
  // Section 9: the manual form stays fully functional and always reachable, so
  // "Type it myself" is always one tap away.
  const [showQuickLog, setShowQuickLog] = useState(!existing)
  const [aiNote, setAiNote] = useState<string | null>(null)

  // Applies a parse to the form. Every field is guarded: the model omits what
  // the note did not mention, and an omitted field must leave the existing
  // value alone rather than blanking it.
  function applyParsed(parsed: ParsedVisit, note: string | null) {
    if (parsed.visitedOn && /^\d{4}-\d{2}-\d{2}$/.test(parsed.visitedOn)) {
      setVisitedOn(parsed.visitedOn)
    }
    if (typeof parsed.rating === "number") {
      setRating(Math.min(10, Math.max(0, parsed.rating)))
    }
    if (parsed.dishes?.length) setDetail(parsed.dishes.join(", "))
    if (parsed.companions?.length) setCompanions(parsed.companions.join(", "))
    if (typeof parsed.pricePaid === "number") setPrice(String(parsed.pricePaid))
    if (typeof parsed.wouldReturn === "boolean") setWouldReturn(parsed.wouldReturn)
    if (parsed.notes) setNotes(parsed.notes)
    setAiNote(note)
    setShowQuickLog(false)
  }

  function save() {
    const input: VisitInput = {
      placeId,
      visitedOn,
      rating,
      notes: notes.trim() || null,
      dishes: isFood ? splitList(detail) : [],
      activity: isFood ? [] : splitList(detail),
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

  if (showQuickLog) {
    return (
      <QuickLog onParsed={applyParsed} onSkip={() => setShowQuickLog(false)} />
    )
  }

  return (
    <div className="space-y-4">
      {aiNote && (
        <p className="border-line text-text-dim rounded-xl border px-3 py-2 text-xs">
          {aiNote}
        </p>
      )}

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
        <label htmlFor="detail" className="text-text-dim text-sm">
          {meta.detailLabel}
        </label>
        <input
          id="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={meta.detailPlaceholder}
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
