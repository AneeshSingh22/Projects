"use client"

import { useEffect, useMemo, useState } from "react"
import { Tag, X, Clock, MapPin } from "lucide-react"
import { getDeals } from "@/app/actions/deals"
import {
  dealStatus,
  describeDays,
  describeWindow,
} from "@/lib/deals/active"
import { distanceKm } from "@/lib/search/apply"
import type { DealWithPlace, PlaceMarker } from "@/types/db"
import { useLocation } from "@/lib/location/useLocation"

// Deals you have logged, filtered to what is running right now.
//
// Self-logged rather than fetched: there is no free, reliable source of
// restaurant deals, and a guessed one is worse than none, because you would
// drive somewhere on it. See supabase/migration-deals.sql.
export function DealsPanel({
  onSelectPlace,
}: {
  onSelectPlace: (place: PlaceMarker) => void
}) {
  const [open, setOpen] = useState(false)
  const [deals, setDeals] = useState<DealWithPlace[] | null>(null)
  // Shared with the blue dot, What now and Ask - one permission prompt for the
  // whole app rather than one per panel.
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const { once } = useLocation(false)
  // Re-evaluated on a timer so a happy hour starting at 4pm appears without a
  // reload. A minute is granular enough for something measured in hours.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
    getDeals().then(setDeals).catch(() => setDeals([]))
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    once().then((o) => {
      if (!cancelled) setOrigin(o)
    })
    return () => {
      cancelled = true
    }
  }, [open, once])

  const { live, upcoming } = useMemo(() => {
    void tick
    const now = new Date()
    const live: { deal: DealWithPlace; endsIn: number | null; km: number | null }[] = []
    const upcoming: { deal: DealWithPlace; startsIn: number }[] = []

    for (const d of deals ?? []) {
      const s = dealStatus(d, now)
      if (s.state === "active") {
        live.push({
          deal: d,
          endsIn: s.endsInMinutes,
          km: origin && d.place ? distanceKm(origin, d.place) : null,
        })
      } else if (s.state === "later_today") {
        upcoming.push({ deal: d, startsIn: s.startsInMinutes })
      }
    }

    // Nearest first when location is known - a deal you can walk to beats one
    // across town, regardless of how long it has left.
    live.sort((a, b) => {
      if (a.km != null && b.km != null) return a.km - b.km
      return (a.endsIn ?? 9999) - (b.endsIn ?? 9999)
    })
    upcoming.sort((a, b) => a.startsIn - b.startsIn)
    return { live, upcoming }
  }, [deals, origin, tick])

  const liveCount = live.length

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface/95 border-line text-text hover:border-line-strong pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-3 text-sm backdrop-blur-xl transition-all sm:gap-2.5 sm:px-6 sm:py-4 sm:text-base"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <Tag className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        Deals
        {liveCount > 0 && (
          <span className="bg-accent flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white">
            {liveCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto w-72 overflow-hidden rounded-2xl border backdrop-blur-xl duration-200 animate-in fade-in slide-in-from-top-2"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <span className="flex items-center gap-2">
          <Tag className="text-text-dim h-4 w-4" />
          <span className="font-display text-text text-sm">Deals</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[55dvh] overflow-y-auto overscroll-contain">
        {deals == null ? (
          <p className="text-text-dim px-4 py-4 text-xs">Loading…</p>
        ) : deals.length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-text text-sm">No deals logged yet.</p>
            <p className="text-text-dim mt-1.5 text-xs leading-relaxed">
              When you spot one — half-price apps, $6 drafts — add it from that
              place&apos;s panel. It will show up here whenever it is running.
            </p>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-text-dim bg-surface-raised/50 px-4 py-1.5 text-[11px] tracking-wide">
                Running now
              </h3>
              {live.length === 0 ? (
                <p className="text-text-dim px-4 py-3 text-xs">
                  Nothing running right now.
                </p>
              ) : (
                <ul>
                  {live.map(({ deal, endsIn, km }) => (
                    <li key={deal.id}>
                      <button
                        type="button"
                        onClick={() =>
                          deal.place && onSelectPlace(deal.place as PlaceMarker)
                        }
                        className="hover:bg-surface-raised border-line w-full border-b px-4 py-3 text-left transition-colors last:border-b-0"
                      >
                        <span className="text-text block text-sm">
                          {deal.description}
                        </span>
                        <span className="text-text-dim mt-0.5 block truncate text-xs">
                          {deal.place?.name}
                        </span>
                        <span className="text-text-dim mt-1 flex items-center gap-3 text-[11px]">
                          {endsIn != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {endsIn < 60
                                ? `${endsIn}m left`
                                : `${Math.floor(endsIn / 60)}h ${endsIn % 60}m left`}
                            </span>
                          )}
                          {km != null && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              {km < 1
                                ? `${Math.round(km * 1000)} m`
                                : `${km.toFixed(1)} km`}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {upcoming.length > 0 && (
              <section>
                <h3 className="text-text-dim bg-surface-raised/50 px-4 py-1.5 text-[11px] tracking-wide">
                  Later today
                </h3>
                <ul>
                  {upcoming.map(({ deal, startsIn }) => (
                    <li key={deal.id}>
                      <button
                        type="button"
                        onClick={() =>
                          deal.place && onSelectPlace(deal.place as PlaceMarker)
                        }
                        className="hover:bg-surface-raised border-line w-full border-b px-4 py-3 text-left transition-colors last:border-b-0"
                      >
                        <span className="text-text block text-sm">
                          {deal.description}
                        </span>
                        <span className="text-text-dim mt-0.5 block truncate text-xs">
                          {deal.place?.name} ·{" "}
                          {startsIn < 60
                            ? `in ${startsIn}m`
                            : `in ${Math.floor(startsIn / 60)}h`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="text-text-dim bg-surface-raised/50 px-4 py-1.5 text-[11px] tracking-wide">
                All deals
              </h3>
              <ul>
                {deals.map((deal) => (
                  <li
                    key={deal.id}
                    className="border-line border-b px-4 py-2.5 last:border-b-0"
                  >
                    <span className="text-text block text-xs">
                      {deal.description}
                    </span>
                    <span className="text-text-dim block text-[11px]">
                      {deal.place?.name} · {describeDays(deal.days)}
                      {describeWindow(deal.starts_at, deal.ends_at)
                        ? ` · ${describeWindow(deal.starts_at, deal.ends_at)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
