"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AuthState = { error?: string; email: string }

// Sign-in only. There is deliberately no sign-up path in this app.
//
// The single account is created by hand in the Supabase dashboard with
// auto-confirm enabled. Exposing a sign-up form on a public URL would let
// strangers create accounts against this project's quota - row level security
// would keep them out of Aneesh's data, but they would still be consuming a
// free tier sized for one person. Creating the account out-of-band removes the
// question entirely, and costs nothing given there will only ever be one user.
//
// Password rather than emailed link or code: Supabase will not send a code
// without paid-tier custom SMTP, and a magic link opens in Safari rather than
// an installed iOS PWA, which would silently leave the installed app logged
// out. A password is entered in whatever context the user is already in, and a
// password manager fills it. See DECISIONS.md, Phase 0.
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { email, error: "Enter your email and password." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase returns a deliberately vague "Invalid login credentials" for both
    // a wrong password and a nonexistent account, so the response cannot be used
    // to discover which emails have accounts. Passing it through unchanged.
    return { email, error: error.message }
  }

  // Outside the error branch on purpose: redirect() works by throwing, so
  // calling it inside a try/catch would have the catch swallow the redirect.
  redirect("/")
}
