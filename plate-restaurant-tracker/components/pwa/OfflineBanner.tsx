"use client"

import { useSyncExternalStore } from "react"
import { CloudOff } from "lucide-react"

// Online/offline is external browser state, not React state, so it is read with
// useSyncExternalStore rather than mirrored into useState via an effect.
//
// That is not just lint-appeasing. The effect version had a real gap: it read
// navigator.onLine after mount, so a page loaded while already offline rendered
// as online for a frame. This subscribes properly and takes a server snapshot
// of "online", which is the only sane assumption when rendering on a server.
function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )

  if (online) return null

  // Says what still works rather than just announcing a problem: reads are
  // served from the cache, writes are not possible, and without saying so the
  // difference is invisible until a save fails.
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
      <span className="bg-surface/95 border-line text-text-dim flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md">
        <CloudOff className="h-3.5 w-3.5" />
        Offline — your places are readable, new entries need a connection
      </span>
    </div>
  )
}
