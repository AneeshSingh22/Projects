"use client"

import { useEffect } from "react"

// Registers the service worker. Development is excluded on purpose: a service
// worker caching a dev build produces stale code that survives a refresh, which
// is a genuinely confusing class of bug to debug.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")

        // Browsers only re-check sw.js on their own schedule, which can be a
        // day. Asking explicitly on every load means a deploy is picked up the
        // next time the app opens rather than whenever the browser decides.
        reg.update().catch(() => {})

        // When a new worker takes control, the page is still running code from
        // the old one. Reloading once puts the user on the build they just
        // downloaded - without this, a deploy would appear to do nothing until
        // they happened to close every tab.
        let reloading = false
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return
          reloading = true
          window.location.reload()
        })
      } catch {
        // Registration failing is not worth surfacing: the app works fine
        // online without it, and offline is an enhancement.
      }
    }

    // Registered after load so it never competes with the first paint for
    // bandwidth on a phone connection.
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register)

    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
