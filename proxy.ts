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
    // Everything except Next internals and static assets. Keeping images and
    // fonts out matters: this runs on every matched request, and each pass
    // makes a getUser() call to Supabase.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
}
