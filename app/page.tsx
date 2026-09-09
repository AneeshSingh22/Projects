import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PlateMap } from "@/components/map/PlateMap"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // proxy.ts already gates this route. Checked again here on purpose: a route
  // rendering user data should not depend solely on a matcher pattern staying
  // correct.
  if (!user) redirect("/login")

  return (
    // h-dvh, not h-screen — section 10. Mobile browser chrome makes 100vh wrong
    // on iOS, leaving the bottom of the map under the address bar.
    <div className="relative h-dvh w-full overflow-hidden">
      {/* The map is always in the tree, never conditional, never keyed.
          Everything else is a sibling layered above it — never a wrapper.
          See plan.md section 5, Rule 2. */}
      <PlateMap />

      {/* Phase 2 puts the search pill here and Phase 3 the bottom sheet. Both
          are siblings of the map, so they can mount and unmount freely without
          ever touching the map instance. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
        <div className="pointer-events-auto flex items-center justify-between">
          <span className="font-display text-text text-lg tracking-tight">
            Plate
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="bg-surface/80 text-text-dim hover:text-text border-line rounded-full border px-3 py-1.5 text-xs backdrop-blur-md transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
    </div>
  )
}
