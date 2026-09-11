"use client"

import { useEffect, useState, useTransition } from "react"
import { Drawer } from "vaul"
import { Pencil, Trash2, Plus, X, MapPinOff } from "lucide-react"
import { getPlaceDetail } from "@/app/actions/place-detail"
import { deleteVisit } from "@/app/actions/visits"
import { deletePlace, getPlaceDeleteImpact, updatePlaceCategory } from "@/app/actions/places"
import { CATEGORIES, CATEGORY_ORDER, type PlaceCategory } from "@/lib/categories"
import { getSignedPhotos, type SignedPhoto } from "@/app/actions/photos"
import { PhotoUpload } from "./PhotoUpload"
import { PhotoStrip } from "./PhotoStrip"
import { VisitForm } from "./VisitForm"
import { CountUp } from "./CountUp"
import { ratingColor, formatRating, RATING_NONE } from "@/lib/rating/ramp"
import type { PlaceDetail, PlaceMarker, Visit } from "@/types/db"

// Three detents - plan.md section 8: peek (name + rating), half (photos + last
// visit), full (complete history). vaul expresses these as snap points, which
// is why it was worth a dependency: the alternative is roughly 200 lines of
// pointer maths for the app's single most-used interaction.
const SNAP_POINTS = [0.18, 0.55, 0.96]

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PlaceSheet({
  place,
  openToLog = false,
  onClose,
  onChanged,
}: {
  place: PlaceMarker | null
  // Open straight into the visit form instead of the history view. Used by the
  // "I ate here" path so adding a place and logging the meal is one action.
  openToLog?: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<PlaceDetail | null>(null)
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1])
  const [mode, setMode] = useState<"view" | "new" | { edit: Visit }>("view")
  const [, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState<null | { visitCount: number }>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  // Photos for every visit on this place, signed in one batch when the sheet
  // opens rather than one request per thumbnail (HANDOFF 5a item 7).
  const [photos, setPhotos] = useState<Record<string, SignedPhoto[]>>({})

  const placeId = place?.id ?? null

  useEffect(() => {
    if (!placeId) return
    let cancelled = false
    getPlaceDetail(placeId).then((d) => {
      if (!cancelled) setDetail(d)
    })
    return () => {
      cancelled = true
    }
  }, [placeId])

  // Reset to the history view whenever a different place is opened, so the
  // sheet never opens showing a half-filled form for the previous place.
  //
  // Keyed off placeId rather than synced in an effect: storing which place the
  // current mode belongs to lets the reset be derived at render, which avoids
  // a cascading second render every time a pin is tapped.
  // Tracks which place the current mode belongs to. Cleared when the sheet
  // closes, not just when the place changes: otherwise adding a place (which
  // opens the form), closing, then tapping that same pin would reopen the form
  // instead of the history, because placeId never changed.
  const [modeFor, setModeFor] = useState<string | null>(placeId)
  if (modeFor !== placeId) {
    setModeFor(placeId)
    setMode(openToLog ? "new" : "view")
    // Straight to the tallest detent when logging: the form needs the room,
    // and landing on a half-height sheet with the fields cut off is the kind
    // of thing that makes a 15-second log take a minute.
    setSnap(openToLog ? SNAP_POINTS[2] : SNAP_POINTS[1])
  }

  // Signed URLs expire, so they are fetched per sheet-open rather than stored.
  const visitIds = (detail?.visits ?? []).map((v) => v.id).join(",")
  useEffect(() => {
    if (!visitIds) {
      return
    }
    let cancelled = false
    getSignedPhotos(visitIds.split(",")).then((p) => {
      if (!cancelled) setPhotos(p)
    })
    return () => {
      cancelled = true
    }
  }, [visitIds])

  function reload() {
    if (!placeId) return
    getPlaceDetail(placeId).then(setDetail)
    onChanged()
  }

  const open = place != null
  // Only trust detail that belongs to the place currently open, so a slow load
  // for a previous pin cannot render under this one's name.
  const shown = detail?.id === placeId ? detail : null
  const avg = shown?.avgRating ?? null

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setModeFor(null)
          onClose()
        }
      }}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      // Bottom sheet, not modal - section 8 requires the map stay visible AND
      // interactive behind it.
      //
      // modal={false} alone is not enough. vaul still renders a full-screen
      // overlay above the page and applies scroll locking, so every tap aimed
      // at the map, the search pill or empty space was being swallowed - the
      // app looked frozen with only the sheet responding.
      //
      // dismissible keeps drag-down-to-close; the overlay is simply never
      // rendered, and the content below explicitly re-enables pointer events.
      modal={false}
      dismissible
    >
      <Drawer.Portal>
        <Drawer.Content
          className="bg-surface border-line pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[96dvh] max-w-md flex-col rounded-t-2xl border-t outline-none md:right-auto md:left-4 md:w-[380px]"
          aria-describedby={undefined}
          // Without this, vaul steals focus back into the sheet on every
          // outside tap, which is what made the map unclickable even once the
          // overlay was gone.
          // Keeping the sheet open when the user taps elsewhere is what makes
          // the map usable behind it. But preventDefault here swallows the
          // pointer event entirely, which also killed clicks on the photo
          // lightbox - that is portalled to document.body, so it counts as
          // "outside" the sheet.
          //
          // So: stop the sheet from closing, but let the event itself reach
          // whatever was actually clicked.
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null
            if (target?.closest("[data-plate-overlay]")) return
            e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement | null
            if (target?.closest("[data-plate-overlay]")) return
            e.preventDefault()
          }}
        >
          {/* Drag handle. Also cycles detents on tap: dragging is fiddly with
              a trackpad, and on a phone a tap target is more reliable than a
              precise drag when the sheet is nearly full. */}
          <button
            type="button"
            aria-label="Resize panel"
            onClick={() => {
              const i = SNAP_POINTS.indexOf(snap as number)
              setSnap(SNAP_POINTS[(i + 1) % SNAP_POINTS.length])
            }}
            className="mx-auto mt-3 shrink-0 cursor-grab px-6 py-2"
          >
            <span className="bg-line block h-1.5 w-12 rounded-full" />
          </button>

          {/* Explicit close. Drag-to-dismiss is not discoverable, and on
              desktop there is no obvious gesture at all. */}
          <button
            type="button"
            onClick={() => {
              setModeFor(null)
              onClose()
            }}
            aria-label="Close"
            className="text-text-dim hover:text-text absolute top-3 right-3 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            <div className="flex items-start justify-between gap-4 pt-3">
              <div className="min-w-0">
                <Drawer.Title className="font-display text-text truncate text-xl leading-tight">
                  {place?.name ?? ""}
                </Drawer.Title>
                <p className="text-text-dim mt-0.5 truncate text-xs">
                  {[shown?.cuisine?.replaceAll("_", " "), shown?.city]
                    .filter(Boolean)
                    .join(" · ") || " "}
                </p>
                {/* The category is guessed from Google's place type, so it is
                    an editable control rather than a label - no rule table gets
                    every place right, and a wrong guess should cost one tap. */}
                {place && (
                  <select
                    value={place.category}
                    onChange={(e) => {
                      const next = e.target.value as PlaceCategory
                      startTransition(async () => {
                        await updatePlaceCategory(place.id, next)
                        onChanged()
                      })
                    }}
                    aria-label="Category"
                    className="bg-surface-raised border-line text-text-dim mt-2 rounded-full border px-2 py-1 text-xs"
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIES[c].label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span
                className="font-display shrink-0 leading-none tabular-nums"
                style={{
                  fontSize: "var(--text-rating)",
                  color: avg == null ? RATING_NONE : ratingColor(avg),
                }}
              >
                {avg == null ? "–" : <CountUp value={avg} />}
              </span>
            </div>

            <p className="text-text-dim mt-2 text-xs">
              {shown == null
                ? "Loading…"
                : shown.visitCount === 0
                  ? "No visits yet"
                  : `${shown.visitCount} visit${shown.visitCount === 1 ? "" : "s"}${
                      shown.lastVisitedOn
                        ? ` · last ${formatDate(shown.lastVisitedOn)}`
                        : ""
                    }`}
            </p>

            <div className="mt-4">
              {confirmDelete ? (
                <div className="border-line rounded-xl border p-4">
                  <p className="text-text text-sm font-medium">
                    Remove {place?.name}?
                  </p>
                  <p className="text-text-dim mt-2 text-sm">
                    {confirmDelete.visitCount === 0
                      ? "This place has no visits logged. The pin will be removed from your map."
                      : `This will also permanently delete ${confirmDelete.visitCount} logged visit${
                          confirmDelete.visitCount === 1 ? "" : "s"
                        }, including any notes and photos. This cannot be undone.`}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        if (!placeId) return
                        setDeleting(true)
                        startTransition(async () => {
                          const r = await deletePlace(placeId)
                          setDeleting(false)
                          if (r.ok) {
                            setConfirmDelete(null)
                            onChanged()
                            onClose()
                          }
                        })
                      }}
                      className="bg-r-low text-text flex-1 rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                    >
                      {deleting ? "Removing…" : "Yes, remove it"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="border-line text-text-dim hover:text-text rounded-full border px-4 py-2.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : mode === "view" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("new")
                      setSnap(SNAP_POINTS[2])
                    }}
                    className="bg-r-good text-text flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Log a visit
                  </button>

                  <ul className="mt-5 space-y-3">
                    {shown?.visits.map((v) => (
                      <li key={v.id} className="border-line rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-text-dim text-xs">
                              {formatDate(v.visited_on)}
                            </span>
                            {(v.dishes?.length || v.activity?.length) ? (
                              <p className="text-text mt-1 text-sm">
                                {[...(v.dishes ?? []), ...(v.activity ?? [])].join(", ")}
                              </p>
                            ) : null}
                            {v.companions?.length ? (
                              <p className="text-text-dim mt-0.5 text-xs">
                                with {v.companions.join(", ")}
                              </p>
                            ) : null}
                            {v.notes && (
                              <p className="text-text-dim mt-1 text-sm">{v.notes}</p>
                            )}
                            {v.price_paid != null && (
                              <p className="text-text-dim mt-1 text-xs">
                                ${Number(v.price_paid).toFixed(2)}
                              </p>
                            )}
                            <PhotoStrip
                              photos={photos[v.id] ?? []}
                              onChanged={reload}
                            />
                            <div className="mt-2">
                              <PhotoUpload visitId={v.id} onUploaded={reload} />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {v.rating != null && (
                              <span
                                className="font-display text-lg leading-none tabular-nums"
                                style={{ color: ratingColor(Number(v.rating)) }}
                              >
                                {formatRating(Number(v.rating))}
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label="Edit visit"
                              onClick={() => {
                                setMode({ edit: v })
                                setSnap(SNAP_POINTS[2])
                              }}
                              className="text-text-dim hover:text-text"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete visit"
                              onClick={() => {
                                if (!confirm("Delete this visit?")) return
                                startTransition(async () => {
                                  await deleteVisit(v.id)
                                  reload()
                                })
                              }}
                              className="text-text-dim hover:text-r-good"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Remove the place entirely. Sits below the history rather
                      than beside the title, so it is reachable but never the
                      thing a thumb lands on by accident. */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!placeId) return
                      getPlaceDeleteImpact(placeId).then(setConfirmDelete)
                    }}
                    className="border-line text-text-dim hover:text-r-low mt-6 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm"
                  >
                    <MapPinOff className="h-4 w-4" />
                    Remove this place
                  </button>
                </>
              ) : (
                <VisitForm
                  placeId={placeId!}
                  category={place?.category ?? "other"}
                  existing={typeof mode === "object" ? mode.edit : undefined}
                  onSaved={() => {
                    setMode("view")
                    reload()
                  }}
                  onCancel={() => setMode("view")}
                />
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
