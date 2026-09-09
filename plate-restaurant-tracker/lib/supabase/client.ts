import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env"

// Browser-side client. Reads the session from cookies written by the proxy.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
