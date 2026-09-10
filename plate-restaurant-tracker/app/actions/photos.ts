"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type PhotoRow = {
  id: string
  visit_id: string
  storage_path: string
  thumb_path: string
  caption: string | null
  width: number | null
  height: number | null
  bytes: number | null
  created_at: string
}

export type SignedPhoto = PhotoRow & {
  thumbUrl: string | null
  fullUrl: string | null
}

// Signed URLs expire, so this is how long a sheet stays usable without a
// refresh. An hour is long enough to browse and short enough that a leaked URL
// is not a lasting exposure.
const SIGNED_URL_TTL_SECONDS = 60 * 60

// Records an uploaded photo. The bytes themselves go straight from the browser
// to Supabase Storage; only the metadata passes through here.
export async function recordPhoto(input: {
  visitId: string
  storagePath: string
  thumbPath: string
  width: number
  height: number
  bytes: number
}): Promise<{ ok: true; photo: PhotoRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  // The storage policy requires the first path segment to be the user's id.
  // Checked here too so a bad path fails with a clear message rather than an
  // opaque storage rejection.
  if (!input.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Refusing to record a photo outside your folder." }
  }

  const { data, error } = await supabase
    .from("photos")
    .insert({
      visit_id: input.visitId,
      user_id: user.id,
      storage_path: input.storagePath,
      thumb_path: input.thumbPath,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath("/")
  return { ok: true, photo: data as PhotoRow }
}

// Signs every photo for a set of visits in one batch.
//
// HANDOFF 5a item 7: the bucket is private, so nothing renders without a signed
// URL. The important part is createSignedUrls (plural) - signing one at a time
// would mean a round trip per thumbnail, which is exactly the pattern that
// makes a photo strip feel slow.
export async function getSignedPhotos(
  visitIds: string[],
): Promise<Record<string, SignedPhoto[]>> {
  if (visitIds.length === 0) return {}

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: rows } = await supabase
    .from("photos")
    .select("*")
    .in("visit_id", visitIds)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  const photos = (rows ?? []) as PhotoRow[]
  if (photos.length === 0) return {}

  const paths = [
    ...photos.map((p) => p.thumb_path),
    ...photos.map((p) => p.storage_path),
  ]

  const { data: signed } = await supabase.storage
    .from("visit-photos")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  const urlByPath = new Map<string, string>()
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
  }

  const grouped: Record<string, SignedPhoto[]> = {}
  for (const p of photos) {
    const entry: SignedPhoto = {
      ...p,
      thumbUrl: urlByPath.get(p.thumb_path) ?? null,
      fullUrl: urlByPath.get(p.storage_path) ?? null,
    }
    ;(grouped[p.visit_id] ??= []).push(entry)
  }

  return grouped
}

export async function deletePhoto(
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path, thumb_path")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!photo) return { ok: false, error: "Photo not found." }

  // Files first, then the row. If this order fails partway the row still
  // points at something, which is recoverable; the reverse leaves orphaned
  // bytes that nothing references and nothing will ever clean up.
  await supabase.storage
    .from("visit-photos")
    .remove([photo.storage_path, photo.thumb_path])

  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/")
  return { ok: true }
}

// Running storage total - plan.md section 9, Phase 4: "Show a running storage
// total somewhere in settings." The free tier is 1GB, and knowing where you
// stand is the difference between noticing and being surprised.
export async function getStorageTotal(): Promise<{
  bytes: number
  count: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { bytes: 0, count: 0 }

  const { data } = await supabase
    .from("photos")
    .select("bytes")
    .eq("user_id", user.id)

  const rows = (data ?? []) as { bytes: number | null }[]
  return {
    bytes: rows.reduce((sum, r) => sum + (r.bytes ?? 0), 0),
    count: rows.length,
  }
}
