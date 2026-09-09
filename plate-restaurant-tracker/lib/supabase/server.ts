import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env"

// Server-side client for Server Components, Server Actions and Route Handlers.
// `cookies()` is async in Next 15+, so this function is async too.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. That is fine and expected:
          // proxy.ts refreshes the session on every request, so the write here
          // is redundant rather than lost. Swallowing it keeps reads working
          // in components without needing a separate read-only client.
        }
      },
    },
  })
}
