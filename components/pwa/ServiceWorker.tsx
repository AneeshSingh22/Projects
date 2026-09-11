"use client"

import { useEffect } from "react"

// Registers the service worker. Development is excluded on purpose: a service
// worker caching a dev build produces stale code that survives a refresh, which
// is a genuinely confusing class of bug to debug.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    // Registered after load so it never competes with the first paint for
    // bandwidth on a phone connection.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing is not worth surfacing: the app works fine
        // online without it, and offline is an enhancement.
      })
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register)

    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
