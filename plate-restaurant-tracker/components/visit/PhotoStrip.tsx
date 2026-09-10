"use client"

import { useState } from "react"
import { X, Trash2 } from "lucide-react"
import { deletePhoto, type SignedPhoto } from "@/app/actions/photos"

// The photo strip in the sheet - plan.md section 9, Phase 4: "loads thumbnails
// only; tapping opens the full image."
//
// Thumbnails are ~30KB, full images ~300KB. A visit with six photos costs
// 180KB to show the strip instead of 1.8MB, which is the difference between the
// sheet feeling instant and feeling broken on a phone connection.
//
// Plain <img> rather than next/image, and the lint rule is disabled below
// deliberately rather than worked around.
//
// next/image would be wrong here for three reasons:
//   1. These are signed URLs that expire in an hour. Next's optimiser caches by
//      URL, so every re-sign produces a cache miss and re-optimises bytes that
//      were already optimised.
//   2. Optimising on Vercel is a metered operation. Section 2.1 requires this
//      app cost nothing, and paying to shrink images the browser already shrank
//      to 30KB is the wrong trade.
//   3. The images are already exactly the size they are displayed at - a 400px
//      thumbnail in a 64px box, a 1600px image in a lightbox. There is nothing
//      left for an optimiser to do.
export function PhotoStrip({
  photos,
  onChanged,
}: {
  photos: SignedPhoto[]
  onChanged: () => void
}) {
  const [lightbox, setLightbox] = useState<SignedPhoto | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightbox(p)}
            className="border-line h-16 w-16 shrink-0 overflow-hidden rounded-lg border"
          >
            {p.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbUrl}
                alt={p.caption ?? "Visit photo"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-surface-raised h-full w-full" />
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="bg-ink/95 fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
            className="text-text-dim hover:text-text absolute top-4 right-4"
          >
            <X className="h-6 w-6" />
          </button>

          {lightbox.fullUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.fullUrl}
              alt={lightbox.caption ?? "Visit photo"}
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <button
            type="button"
            disabled={deleting === lightbox.id}
            onClick={async (e) => {
              e.stopPropagation()
              if (!confirm("Delete this photo? This cannot be undone.")) return
              setDeleting(lightbox.id)
              await deletePhoto(lightbox.id)
              setDeleting(null)
              setLightbox(null)
              onChanged()
            }}
            className="bg-surface/90 border-line text-text-dim hover:text-r-low absolute bottom-6 flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-md disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting === lightbox.id ? "Deleting…" : "Delete photo"}
          </button>
        </div>
      )}
    </>
  )
}
