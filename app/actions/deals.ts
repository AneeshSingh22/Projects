"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Deal, DealWithPlace } from "@/types/db"

export type DealInput = {
  placeId: string
  description: string
  days: number[]
  startsAt: string | null
  endsAt: string | null
  expiresOn: string | null
  notes: string | null
}

export async function addDeal(
  input: DealInput,
): Promise<{ ok: true; deal: Deal } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const description = input.description.trim()
  if (!description) return { ok: false, error: "Describe the deal." }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      place_id: input.placeId,
      user_id: user.id,
      description,
      // Empty array means every day, and null reads more clearly for that than
      // an empty array does in the database.
      days: input.days.length ? input.days : null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      expires_on: input.expiresOn,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  return { ok: true, deal: data as Deal }
}

export async function deleteDeal(
  dealId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  return { ok: true }
}

// Every deal with its place attached. Filtering to "active right now" happens on
// the client, because "now" is the user's clock rather than the server's, and
// because the whole set is small enough that re-querying on every tick would be
// wasteful.
export async function getDeals(): Promise<DealWithPlace[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, place_id, user_id, description, days, starts_at, ends_at, expires_on, notes, created_at, updated_at, place:places(id, name, lat, lng, category)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to load deals: ${error.message}`)
  return (data ?? []) as unknown as DealWithPlace[]
}

export async function getDealsForPlace(placeId: string): Promise<Deal[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (data ?? []) as Deal[]
}
