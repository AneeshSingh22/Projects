"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import type { ParsedVisit } from "@/app/api/parse-visit/route"

// One text input that pre-fills the manual form - plan.md section 9, Phase 5.
//
// The governing rule of this phase: "The LLM is an accelerator, never a
// dependency." Everything here is optional. If it fails, times out, is rate
// limited, or returns nonsense, the user lands in exactly the same empty form
// they would have got without it, plus a small note. Nothing is ever saved
// automatically - the parse fills fields and the user reviews them.
export function QuickLog({
  onParsed,
  onSkip,
}: {
  onParsed: (parsed: ParsedVisit, note: string | null) => void
  onSkip: () => void
}) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)

  async function parse() {
    const trimmed = text.trim()
    if (!trimmed) {
      onSkip()
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/parse-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          // The server resolves "last Friday" against the user's own date, not
          // the server's, which may be a day off.
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      })

      const data = await res.json()

      if (data?.ok && data.parsed) {
        onParsed(data.parsed as ParsedVisit, null)
      } else {
        // Silent fallback, per section 9. The original text is handed through
        // as notes so nothing the user typed is thrown away.
        onParsed(
          { notes: trimmed },
          "Could not read that automatically - fill in what you need.",
        )
      }
    } catch {
      onParsed(
        { notes: trimmed },
        "Could not read that automatically - fill in what you need.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="quicklog" className="text-text-dim text-sm">
          Describe the visit
        </label>
        <textarea
          id="quicklog"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
          placeholder="pickup game with Rish, 8.5, courts were packed"
          className="bg-surface-raised border-line text-text placeholder:text-text-dim mt-1 w-full resize-none rounded-xl border px-3 py-2.5 text-base outline-none"
        />
        <p className="text-text-dim mt-1 text-xs">
          This only fills in the form. Nothing is saved until you review it.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={parse}
          disabled={busy}
          className="bg-r-good text-text flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {busy ? "Reading…" : "Fill the form"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="border-line text-text-dim hover:text-text rounded-full border px-4 py-3 text-sm"
        >
          Type it myself
        </button>
      </div>
    </div>
  )
}
