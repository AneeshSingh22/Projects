"use client"

import { useEffect, useState, useTransition } from "react"
import { Drawer } from "vaul"
import { Pencil, Trash2, Plus, X, MapPinOff, Tag } from "lucide-react"
import { getPlaceDetail } from "@/app/actions/place-detail"
import { deleteVisit } from "@/app/actions/visits"
import { deletePlace, getPlaceDeleteImpact, updatePlaceCategory } from "@/app/actions/places"
import { CATEGORIES, CATEGORY_ORDER, type PlaceCategory } from "@/lib/categories"
import { getDealsForPlace, deleteDeal } from "@/app/actions/deals"
import { DealForm } from "@/components/deals/DealForm"
import { describeDays, describeWindow } from "@/lib/deals/active"
import type { Deal } from "@/types/db"
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
  const [deals, setDeals] = useState<Deal[]>([])
  const [addingDeal, setAddingDeal] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  // Desktop gets a fixed full-height left rail; phones get a draggable bottom
  // sheet. plan.md section 8: "On desktop, the sheet becomes a left rail at
  // 380px and the map fills the rest."
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // Which place the current mode belongs to. Derived at render rather than
  // synced in an effect, and cleared on close - otherwise adding a place (which
  // opens the form), closing, then tapping that same pin would reopen the form
  // rather than the history, because placeId never changed.
  const [modeFor, setModeFor] = useState<string | null>(placeId)
  if (modeFor !== placeId) {
    setModeFor(placeId)
    setMode(openToLog ? "new" : "view")
    // The form opens at full height: its save button sits below several fields,
    // and landing at half height means dragging the sheet up before you can
    // finish - exactly the friction section 1's "log a visit in under 15
    // seconds" is measured against.
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

  useEffect(() => {
    if (!placeId) return
    let cancelled = false
    getDealsForPlace(placeId).then((d) => {
      if (!cancelled) setDeals(d)
    })
    return () => {
      cancelled = true
    }
  }, [placeId])

  function reload() {
    if (!placeId) return
    getPlaceDetail(placeId).then(setDetail)
    getDealsForPlace(placeId).then(setDeals)
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
      // Snap points are a touch affordance and are wrong on a pointer device -
      // there is nothing to drag toward on a full-height rail. Desktop gets a
      // fixed panel per plan.md section 8; phones keep the draggable sheet.
      snapPoints={isDesktop ? undefined : SNAP_POINTS}
      activeSnapPoint={isDesktop ? undefined : snap}
      setActiveSnapPoint={isDesktop ? undefined : setSnap}
      direction={isDesktop ? "left" : "bottom"}
      // Bottom sheet, not modal - section 8 requires the map stay visible AND
      // interactive behind it.
      //
      // modal={false} stops vaul rendering a full-screen overlay that would
      // swallow every tap aimed at the map. dismissible keeps drag-to-close.
      modal={false}
      dismissible
      // vaul puts position:fixed and overflow:hidden on <body> whenever a
      // drawer is open. That freezes the ENTIRE page, which is why the map was
      // unresponsive far outside the rail's own 380px - the sheet was not
      // intercepting the gestures, the body was refusing to move at all.
      //
      // This app is a full-bleed map with floating panels, not a scrolling
      // document, so there is no background scroll position worth locking.
      noBodyStyles
      preventScrollRestoration={false}
      // Dragging only from the handle. Without it every drag inside the sheet
      // competes with scrolling its content, and the two gestures are
      // indistinguishable until one wins - usually the wrong one. This was lost
      // in an earlier edit and is the second half of the same bug.
      handleOnly
      disablePreventScroll
    >
      <Drawer.Portal>
        <Drawer.Content
          // Height follows the active snap point rather than being fixed at
          // 96dvh. Previously the element was always full height, so its
          // invisible upper portion sat over the map and swallowed every pan -
          // the map looked frozen whenever the sheet was open.
          className="bg-surface border-line pointer-events-auto fixed z-30 flex flex-col overflow-hidden border outline-none
            inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl
            md:inset-y-0 md:right-auto md:left-0 md:mx-0 md:w-[380px] md:max-w-none md:rounded-none md:border-y-0"
          style={{
            boxShadow: "var(--shadow-float)",
            // Phone only: height tracks the snap point so the element matches
            // what is visible and does not cover the map with an invisible
            // upper half. Desktop is a full-height rail, so it is left to CSS.
            ...(isDesktop
              ? {}
              : { height: `${(typeof snap === "number" ? snap : 0.55) * 100}dvh` }),
          }}
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
          {/* vaul's own handle: with handleOnly set, this is the only element
              that initiates a drag, which leaves the content free to scroll.
              Wrapped so a tap still cycles the detents, since dragging is
              fiddly on a trackpad. */}
          <div
            onClick={() => {
              const i = SNAP_POINTS.indexOf(snap as number)
              setSnap(SNAP_POINTS[(i + 1) % SNAP_POINTS.length])
            }}
            className="shrink-0 cursor-grab px-6 pt-3 pb-2 md:hidden"
          >
            <Drawer.Handle className="bg-line-strong mx-auto !h-1.5 !w-12 rounded-full" />
          </div>

          {/* Explicit close. Drag-to-dismiss is not discoverable, and on
              desktop there is no obvious gesture at all. */}
          <button
            type="button"
            onClick={() => {
              setModeFor(null)
              onClose()
            }}
            aria-label="Close"
            className="text-text-dim hover:text-text hover:bg-surface-raised absolute top-3 right-3 z-10 rounded-full p-2 transition-colors md:top-4 md:right-4"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            {actionError && (
              <p
                role="alert"
                className="text-accent border-line mt-3 rounded-xl border border-dashed px-3 py-2 text-xs"
              >
                {actionError}
              </p>
            )}

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
                      setCategoryError(null)
                      startTransition(async () => {
                        // The result was previously discarded, so a rejected
                        // write looked identical to a successful one - the
                        // dropdown snapped back with no explanation. Any action
                        // that can fail has to be able to say so.
                        const r = await updatePlaceCategory(place.id, next)
                        if (!r.ok) {
                          setCategoryError(
                            r.error.includes("invalid input value")
                              ? "That category is not set up in the database yet. Run supabase/migration-nightlife.sql."
                              : r.error,
                          )
                          return
                        }
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
                {categoryError && (
                  <p className="text-accent mt-1.5 text-xs leading-relaxed">
                    {categoryError}
                  </p>
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
                  {/* Deals you have seen here. Above the log button because
                      standing outside deciding whether to go in is when this
                      matters, and that happens before you eat. */}
                  {(deals.length > 0 || addingDeal) && (
                    <div className="mb-4">
                      {addingDeal ? (
                        <DealForm
                          placeId={placeId!}
                          onSaved={() => {
                            setAddingDeal(false)
                            reload()
                          }}
                          onCancel={() => setAddingDeal(false)}
                        />
                      ) : (
                        <ul className="space-y-2">
                          {deals.map((d) => (
                            <li
                              key={d.id}
                              className="border-line bg-surface-raised/40 flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5"
                            >
                              <span className="min-w-0">
                                <span className="text-text block text-sm">
                                  {d.description}
                                </span>
                                <span className="text-text-dim block text-xs">
                                  {describeDays(d.days)}
                                  {describeWindow(d.starts_at, d.ends_at)
                                    ? ` · ${describeWindow(d.starts_at, d.ends_at)}`
                                    : ""}
                                </span>
                              </span>
                              <button
                                type="button"
                                aria-label="Delete deal"
                                onClick={() => {
                                  startTransition(async () => {
                                    const r = await deleteDeal(d.id)
                                    if (!r.ok) {
                                      setActionError(r.error)
                                      return
                                    }
                                    reload()
                                  })
                                }}
                                className="text-text-dim hover:text-accent shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMode("new")
                      setSnap(SNAP_POINTS[2])
                    }}
                    className="bg-accent hover:bg-accent-hover flex w-full items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium text-white transition-all active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Log a visit
                  </button>

                  <ul className="mt-5 space-y-3">
                    {shown?.visits.map((v) => (
                      <li key={v.id} className="border-line bg-surface-raised/40 rounded-2xl border p-3.5 transition-colors">
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
                                  const r = await deleteVisit(v.id)
                                  if (!r.ok) {
                                    setActionError(r.error)
                                    return
                                  }
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
                  {!addingDeal && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingDeal(true)
                        setSnap(SNAP_POINTS[2])
                      }}
                      className="border-line text-text-dim hover:text-text hover:border-line-strong mt-4 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                      Add a deal
                    </button>
                  )}

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
