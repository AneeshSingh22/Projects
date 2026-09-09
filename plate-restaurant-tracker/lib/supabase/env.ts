// Reading env vars through here rather than inline `process.env.X!` so a missing
// value fails at startup with a message that names the variable, instead of
// surfacing later as an opaque "Invalid URL" from deep inside supabase-js.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
)

// Despite the name (kept to match plan.md section 4.4), this holds a modern
// `sb_publishable_...` key. It is safe in client code: it carries no privileges
// beyond what row level security grants the signed-in user.
export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
