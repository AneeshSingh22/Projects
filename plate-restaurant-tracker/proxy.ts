import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

// Next 16 renamed the `middleware.ts` convention to `proxy.ts` and the exported
// function from `middleware` to `proxy`. Supabase's own docs still show the old
// name; this is the current convention, verified against the Next 16 docs
// shipped in node_modules/next/dist/docs.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and the PWA files.
    //
    // The PWA exclusions are load-bearing, not tidiness: a browser fetches the
    // manifest and the service worker WITHOUT credentials, so the auth guard
    // redirected both to /login. A manifest that 307s cannot be installed, and
    // a service worker that 307s never registers - so the app silently refuses
    // to install with no error anywhere.
    //
    // Keeping images and fonts out matters too: this runs on every matched
    // request and each pass makes a getUser() call to Supabase.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
}
