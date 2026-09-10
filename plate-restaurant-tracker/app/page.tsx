import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPlaces } from "@/lib/places/queries"
import { MapSurface } from "@/components/map/MapSurface"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetched once on the server and handed down. See lib/places/queries.ts for
  // why this is not a viewport-bounded query.
  const places = await getPlaces()

  return <MapSurface initialPlaces={places} />
}
