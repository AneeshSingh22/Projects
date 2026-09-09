"use client"

import { APIProvider } from "@vis.gl/react-google-maps"

// plan.md section 5, Rule 1: APIProvider lives in the root layout and never
// unmounts, so the Maps JavaScript bundle is fetched exactly once per session.
//
// It is extracted into its own client component because section 10 requires the
// root layout stay a Server Component. The layout imports this; only this
// subtree is client-side.
//
// Nothing below this may load the Maps script again. Do not add a <script> tag,
// and do not call the legacy google.maps.Loader anywhere.
export function MapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    // Rendering children without the provider keeps the rest of the app usable
    // (auth, forms) when the key is absent, rather than white-screening
    // everything. The map itself reports the problem in its own surface.
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[MAPS] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. The map will not render.",
      )
    }
    return <>{children}</>
  }

  return <APIProvider apiKey={apiKey}>{children}</APIProvider>
}
