"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
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
//   3. The images are already exactly the size they are displayed at.
export function PhotoStrip({
  photos,
  onChanged,
}: {
  photos: SignedPhoto[]
  onChanged: () => void
}) {
  const [lightbox, setLightbox] = useState<SignedPhoto | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Escape closes the lightbox, matching every other image viewer.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  if (photos.length === 0) return null

  const lightboxNode = lightbox ? (
    <div
      // Marks this subtree as a deliberate overlay. PlaceSheet checks for this
      // so its outside-tap guard does not swallow clicks in here.
      data-plate-overlay=""
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
      // Same reasoning as the close button: pointerdown rather than click, so
      // the three ways out of here (backdrop, X, Escape) all behave the same.
      onPointerDown={() => setLightbox(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
    >
      <button
        type="button"
        aria-label="Close photo"
        // pointerdown, not click: a click requires a matching down and up on
        // the same element, which is fragile when an ancestor is also handling
        // pointer events. Closing on the press is also simply more responsive.
        onPointerDown={(e) => {
          e.stopPropagation()
          setLightbox(null)
        }}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
      >
        <X className="h-6 w-6" />
      </button>

      {error && (
        <p
          role="alert"
          className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"
        >
          {error}
        </p>
      )}

      {lightbox.fullUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lightbox.fullUrl}
          alt={lightbox.caption ?? "Visit photo"}
          className="max-h-[85dvh] max-w-full rounded-lg object-contain"
          // Tapping the photo itself must not dismiss it.
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}

      <button
        type="button"
        disabled={deleting === lightbox.id}
        // stopPropagation on the press so the backdrop handler above does not
        // close the lightbox before this button's click can run.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={async (e) => {
          e.stopPropagation()
          if (!confirm("Delete this photo? This cannot be undone.")) return
          setDeleting(lightbox.id)
          const r = await deletePhoto(lightbox.id)
          setDeleting(null)
          if (!r.ok) {
            setError(r.error)
            return
          }
          setLightbox(null)
          onChanged()
        }}
        className="absolute bottom-6 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-md hover:text-white disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        {deleting === lightbox.id ? "Deleting…" : "Delete photo"}
      </button>
    </div>
  ) : null

  return (
    <>
      {/* Bigger thumbnails. At 64px a plate of food is unrecognisable, which
          defeats the point of having photos at all. These are 96px and the
          strip scrolls horizontally when there are several. */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightbox(p)}
            className="border-line h-24 w-24 shrink-0 overflow-hidden rounded-lg border transition-opacity hover:opacity-80"
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

      {/* Rendered into document.body rather than inline.
          The strip lives inside the sheet, which creates its own stacking
          context - so a lightbox rendered here appeared UNDERNEATH the sheet
          no matter how high its z-index went. Portalling to the body escapes
          that context entirely. */}
      {/* document exists only in the browser; this component is inside the
          sheet which never server-renders its open state, but the guard keeps
          it safe regardless without needing a mounted flag in state. */}
      {lightboxNode && typeof document !== "undefined"
        ? createPortal(lightboxNode, document.body)
        : null}
    </>
  )
}
