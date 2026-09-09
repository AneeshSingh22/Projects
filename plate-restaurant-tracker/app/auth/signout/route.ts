import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST, not GET: a GET sign-out can be triggered by any image or link tag
// pointing at this URL, which logs the user out unintentionally.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 })
}
