"use client"

import { useState } from "react"
import { Lightbulb, Loader2, ExternalLink } from "lucide-react"
import type { PlaceLore as Lore } from "@/app/api/place-lore/route"

// "What is this place known for?" - shown only for places with no visits yet,
// because once you have been, your own rating and notes are better than any
// recollection.
//
// Presented as recollection, never as fact. The model is accurate on well-known
// venues and correctly refuses on invented names, but it claimed high
// confidence on a small Shaw restaurant it is unlikely to genuinely know. The
// label is therefore not decoration - it is the honest description of what this
// is, and the Google link is there for when you want the real answer.
export function PlaceLore({
  placeId,
  placeName,
}: {
  placeId: string
  placeName: string
}) {
  const [lore, setLore] = useState<Lore | null>(null)
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState(false)

  async function look() {
    setBusy(true)
    setAsked(true)
    try {
      const res = await fetch("/api/place-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      })
      const data = await res.json()
      setLore(data?.ok ? (data.lore as Lore) : null)
    } catch {
      setLore(null)
    } finally {
      setBusy(false)
    }
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`

  if (!asked) {
    return (
      <button
        type="button"
        onClick={look}
        className="border-line text-text-dim hover:text-text hover:border-line-strong mt-4 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors"
      >
        <Lightbulb className="h-4 w-4" />
        What is this place known for?
      </button>
    )
  }

  return (
    <div className="border-line mt-4 rounded-xl border p-3">
      {busy ? (
        <p className="text-text-dim flex items-center gap-2 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Thinking…
        </p>
      ) : lore?.known ? (
        <>
          {lore.knownFor && (
            <p className="text-text text-sm leading-relaxed">{lore.knownFor}</p>
          )}
          {lore.popular && lore.popular.length > 0 && (
            <div className="mt-2.5">
              <p className="text-text-dim text-[11px]">Commonly mentioned</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {lore.popular.map((p) => (
                  <li
                    key={p}
                    className="bg-surface-raised text-text rounded-full px-2.5 py-1 text-xs"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Not fine print. This is a recollection from training data - it can
              be out of date and it can be wrong about smaller places. */}
          <p className="text-text-dim mt-3 text-[11px] leading-relaxed">
            From the model&apos;s general knowledge, not from reviews. It may be
            out of date or wrong, especially for smaller or newer places.
          </p>
        </>
      ) : (
        <p className="text-text-dim text-sm leading-relaxed">
          Nothing reliable to say about this one — it is not a place the model
          recognises.
        </p>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-dim hover:text-text mt-3 inline-flex items-center gap-1.5 text-xs underline"
      >
        <ExternalLink className="h-3 w-3" />
        Check real reviews on Google
      </a>
    </div>
  )
}
