"use client"

import { useState, useTransition } from "react"
import { addDeal } from "@/app/actions/deals"

const DAYS = [
  { n: 1, label: "M" },
  { n: 2, label: "T" },
  { n: 3, label: "W" },
  { n: 4, label: "T" },
  { n: 5, label: "F" },
  { n: 6, label: "S" },
  { n: 7, label: "S" },
]

const field =
  "bg-surface-raised border-line text-text placeholder:text-text-dim w-full rounded-xl border px-3 py-2.5 text-base outline-none"

export function DealForm({
  placeId,
  onSaved,
  onCancel,
}: {
  placeId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState("")
  const [days, setDays] = useState<number[]>([])
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleDay(n: number) {
    setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]))
  }

  function save() {
    if (!description.trim()) {
      setError("Describe the deal.")
      return
    }
    // A start without an end (or vice versa) would make "is it running now?"
    // unanswerable, so both or neither.
    if (Boolean(startsAt) !== Boolean(endsAt)) {
      setError("Give both a start and end time, or neither.")
      return
    }

    startTransition(async () => {
      const result = await addDeal({
        placeId,
        description: description.trim(),
        days,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        expiresOn: null,
        notes: null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="deal-desc" className="text-text-dim text-sm">
          What is the deal
        </label>
        <input
          id="deal-desc"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setError(null)
          }}
          autoFocus
          placeholder="Half price appetisers"
          className={`${field} mt-1`}
        />
      </div>

      <div>
        <span className="text-text-dim text-sm">Which days</span>
        <div className="mt-1.5 flex gap-1.5">
          {DAYS.map((d, i) => {
            const on = days.includes(d.n)
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(d.n)}
                aria-pressed={on}
                className={`h-9 flex-1 rounded-lg border text-xs transition-colors ${
                  on
                    ? "bg-accent border-accent text-white"
                    : "border-line text-text-dim hover:border-line-strong"
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
        <p className="text-text-dim mt-1.5 text-xs">
          {days.length === 0 ? "No days picked means every day." : ""}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="deal-start" className="text-text-dim text-sm">
            From
          </label>
          <input
            id="deal-start"
            type="time"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={`${field} mt-1`}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="deal-end" className="text-text-dim text-sm">
            Until
          </label>
          <input
            id="deal-end"
            type="time"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={`${field} mt-1`}
          />
        </div>
      </div>
      <p className="text-text-dim -mt-2 text-xs">
        Leave both blank if it runs all day.
      </p>

      {error && <p className="text-accent text-sm">{error}</p>}

      <div className="flex gap-2 pb-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="bg-accent hover:bg-accent-hover flex-1 rounded-full px-4 py-3 text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save deal"}
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
