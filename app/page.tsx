import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // proxy.ts already gates this route. Checking again here is deliberate
  // belt-and-braces: a route that renders user data should never depend solely
  // on a matcher pattern staying correct.
  if (!user) redirect("/login")

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Plate</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as <span className="text-foreground">{user.email}</span>
      </p>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </main>
  )
}
