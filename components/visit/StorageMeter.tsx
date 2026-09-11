"use client"

import { useEffect, useState } from "react"
import { getStorageTotal } from "@/app/actions/photos"

const FREE_TIER_BYTES = 1024 * 1024 * 1024 // 1GB

function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// plan.md section 9, Phase 4: "Show a running storage total somewhere in
// settings." There is no settings screen yet, so it sits quietly bottom-left,
// only appearing once at least one photo exists.
export function StorageMeter() {
  const [total, setTotal] = useState<{ bytes: number; count: number } | null>(
    null,
  )

  useEffect(() => {
    getStorageTotal().then(setTotal)
  }, [])

  if (!total || total.count === 0) return null

  const pct = (total.bytes / FREE_TIER_BYTES) * 100

  return (
    // Above the What now button, which owns the bottom-left corner. Stacking
    // rather than moving it elsewhere keeps the incidental information out of
    // the corners the thumb actually uses.
    // Sits above the What now button. Kept at z-10 so the desktop rail covers
    // it rather than the other way round - this is incidental information and
    // is not worth shifting the layout for.
    <div className="pointer-events-none absolute bottom-20 left-4 z-10">
      <span className="bg-surface/80 border-line text-text-dim rounded-full border px-3 py-1.5 text-[11px] backdrop-blur-md">
        {total.count} photo{total.count === 1 ? "" : "s"} · {human(total.bytes)} ·{" "}
        {pct < 0.1 ? "<0.1" : pct.toFixed(1)}% of free tier
      </span>
    </div>
  )
}
