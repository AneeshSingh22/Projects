"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { compressForUpload } from "@/lib/photos/compress"
import { recordPhoto } from "@/app/actions/photos"

// Camera capture - plan.md section 9, Phase 4.
//
// A file input with capture="environment", never getUserMedia. Section 10 is
// explicit: getUserMedia behaves differently inside an installed PWA on iOS,
// where this app is meant to live. The file input opens the system camera and
// works identically in Safari and standalone mode.
//
// Bytes go straight from the browser to Supabase Storage rather than through a
// server route. Routing them through the app would mean uploading each photo
// twice and would hit serverless request size limits.
export function PhotoUpload({
  visitId,
  onUploaded,
}: {
  visitId: string
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setBusy(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in.")

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(
          files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…",
        )

        const { full, thumb, width, height } = await compressForUpload(file)

        // Path shape is dictated by the storage policy: the first segment must
        // be the user id or the upload is rejected (section 10).
        const stem = `${user.id}/${visitId}/${crypto.randomUUID()}`
        const fullPath = `${stem}.jpg`
        const thumbPath = `${stem}_thumb.jpg`

        const up1 = await supabase.storage
          .from("visit-photos")
          .upload(fullPath, full, { contentType: "image/jpeg" })
        if (up1.error) throw new Error(up1.error.message)

        const up2 = await supabase.storage
          .from("visit-photos")
          .upload(thumbPath, thumb, { contentType: "image/jpeg" })
        if (up2.error) {
          // Do not leave the full image orphaned if the thumbnail fails.
          await supabase.storage.from("visit-photos").remove([fullPath])
          throw new Error(up2.error.message)
        }

        const recorded = await recordPhoto({
          visitId,
          storagePath: fullPath,
          thumbPath,
          width,
          height,
          bytes: full.size + thumb.size,
        })

        if (!recorded.ok) {
          await supabase.storage
            .from("visit-photos")
            .remove([fullPath, thumbPath])
          throw new Error(recorded.error)
        }
      }

      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setBusy(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="border-line text-text-dim hover:text-text flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {progress ?? "Add a photo"}
      </button>
      {error && <p className="text-r-low mt-2 text-sm">{error}</p>}
    </div>
  )
}
