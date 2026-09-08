"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AuthState = {
  step: "email" | "code"
  email: string
  error?: string
  notice?: string
}

// Step 1 — ask Supabase to email a 6-digit code.
//
// This is signInWithOtp, the same call that sends a magic link. Which one the
// user receives is decided entirely by the email template in the Supabase
// dashboard: a template containing {{ .Token }} yields a code. We chose codes
// over links because an installed iOS PWA has its own storage jar — a magic
// link opens in Safari, the session lands there, and the installed app stays
// logged out. A typed code is entered in whatever context the user is already
// in, so it works in the PWA, on desktop, anywhere.
export async function sendCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!email || !email.includes("@")) {
    return { step: "email", email, error: "Enter a valid email address." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return { step: "email", email, error: error.message }
  }

  return { step: "code", email, notice: `Code sent to ${email}.` }
}

// Step 2 — exchange the typed code for a session.
export async function verifyCode(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? prev.email).trim().toLowerCase()
  const token = String(formData.get("code") ?? "").trim()

  if (!/^\d{6}$/.test(token)) {
    return { step: "code", email, error: "Enter the 6-digit code from your email." }
  }

  const supabase = await createClient()
  // type "email" covers both sign-up and sign-in for an emailed OTP.
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" })

  if (error) {
    return { step: "code", email, error: error.message }
  }

  redirect("/")
}

export async function startOver(): Promise<AuthState> {
  return { step: "email", email: "" }
}

// Single entry point for the form. useActionState binds one action for the life
// of the component, so the step is carried in a hidden `intent` field rather
// than by swapping which action the form points at.
export async function authenticate(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const intent = String(formData.get("intent") ?? "send")

  if (intent === "reset") return { step: "email", email: "" }
  if (intent === "verify") return verifyCode(prev, formData)
  return sendCode(prev, formData)
}
