"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Visit } from "@/types/db"

export type VisitInput = {
  placeId: string
  visitedOn: string
  rating: number | null
  notes: string | null
  dishes: string[]
  companions: string[]
  pricePaid: number | null
  wouldReturn: boolean | null
  occasion: string | null
}

export type VisitResult =
  | { ok: true; visit: Visit }
  | { ok: false; error: string }

function validate(input: VisitInput): string | null {
  if (!input.placeId) return "No place selected."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitedOn)) return "Pick a valid date."
  if (input.rating != null && (input.rating < 0 || input.rating > 10)) {
    return "Rating must be between 0 and 10."
  }
  if (input.pricePaid != null && input.pricePaid < 0) {
    return "Price cannot be negative."
  }
  return null
}

// Logging a visit. plan.md section 7: a visit is never overwritten - four meals
// at the same restaurant is four rows, and that history is the point of the app.
export async function logVisit(input: VisitInput): Promise<VisitResult> {
  const problem = validate(input)
  if (problem) return { ok: false, error: problem }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { data, error } = await supabase
    .from("visits")
    .insert({
      place_id: input.placeId,
      user_id: user.id,
      visited_on: input.visitedOn,
      rating: input.rating,
      notes: input.notes,
      dishes: input.dishes.length ? input.dishes : null,
      companions: input.companions.length ? input.companions : null,
      price_paid: input.pricePaid,
      would_return: input.wouldReturn,
      occasion: input.occasion,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Logging a visit flips a wishlist place to visited (section 9, Phase 3).
  // Only from want_to_try: it must not overwrite a deliberate 'favorite' or
  // 'avoid', which section 7 says are states independent of visit count.
  const { error: statusError } = await supabase
    .from("places")
    .update({ status: "visited" })
    .eq("id", input.placeId)
    .eq("user_id", user.id)
    .eq("status", "want_to_try")

  if (statusError) {
    // The visit saved; only the status nudge failed. Not worth failing the
    // whole action and making the user retype everything.
    console.error("[logVisit] status update failed:", statusError.message)
  }

  revalidatePath("/")
  return { ok: true, visit: data as Visit }
}

export async function updateVisit(
  visitId: string,
  input: VisitInput,
): Promise<VisitResult> {
  const problem = validate(input)
  if (problem) return { ok: false, error: problem }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { data, error } = await supabase
    .from("visits")
    .update({
      visited_on: input.visitedOn,
      rating: input.rating,
      notes: input.notes,
      dishes: input.dishes.length ? input.dishes : null,
      companions: input.companions.length ? input.companions : null,
      price_paid: input.pricePaid,
      would_return: input.wouldReturn,
      occasion: input.occasion,
    })
    .eq("id", visitId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  return { ok: true, visit: data as Visit }
}

export async function deleteVisit(
  visitId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  return { ok: true }
}
