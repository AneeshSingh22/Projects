"use client"

import { useEffect, useState } from "react"
import { BarChart3, X, Clock, Wallet, Sparkles, Camera } from "lucide-react"
import { getStats, type Stats, type TimelineVisit } from "@/app/actions/stats"
import { CATEGORIES } from "@/lib/categories"
import { ratingColor, formatRating } from "@/lib/rating/ramp"
import type { PlaceMarker } from "@/types/db"

type Tab = "timeline" | "budget" | "review"

// Thresholds below which a section says nothing true.
//
// Showing a ratings-over-time line built from two points is noise presented as
// insight, and the first time someone notices that, they stop trusting every
// other number on the page. Each section states what it needs instead.
const NEEDS = {
  ratingTrend: 3, // months with ratings
  companions: 2, // distinct people
  topPlaces: 3, // rated places
  spendTrend: 2, // months with spend
}

function money(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  })
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function StatsPanel({
  onSelectPlace,
}: {
  onSelectPlace: (place: PlaceMarker) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("timeline")
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!open) return
    getStats().then(setStats).catch(() => setStats(null))
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface/95 border-line text-text hover:border-line-strong pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-3 text-sm backdrop-blur-xl transition-all sm:gap-2.5 sm:px-6 sm:py-4 sm:text-base"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <BarChart3 className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        History
      </button>
    )
  }

  return (
    <div
      className="bg-surface/97 border-line pointer-events-auto flex h-[78dvh] w-[min(92vw,420px)] flex-col overflow-hidden rounded-3xl border backdrop-blur-2xl duration-300 ease-out animate-in fade-in slide-in-from-top-4"
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      <header className="border-line flex shrink-0 items-center justify-between border-b px-4 py-3.5">
        <span className="font-display text-text text-base">History</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-text-dim hover:text-text hover:bg-surface-raised rounded-full p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <nav className="border-line flex shrink-0 border-b">
        {(
          [
            ["timeline", "Timeline", Clock],
            ["budget", "Budget", Wallet],
            ["review", "Review", Sparkles],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
              tab === id
                ? "text-text border-accent border-b-2"
                : "text-text-dim hover:text-text border-b-2 border-transparent"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {stats == null ? (
          <p className="text-text-dim px-4 py-6 text-sm">Loading…</p>
        ) : stats.visits.length === 0 ? (
          <p className="text-text-dim px-4 py-6 text-sm leading-relaxed">
            Nothing logged yet. Once you start recording visits, this is where
            the history, spending and trends show up.
          </p>
        ) : tab === "timeline" ? (
          <Timeline visits={stats.visits} onSelectPlace={onSelectPlace} />
        ) : tab === "budget" ? (
          <Budget stats={stats} />
        ) : (
          <Review stats={stats} />
        )}
      </div>
    </div>
  )
}

function Timeline({
  visits,
  onSelectPlace,
}: {
  visits: TimelineVisit[]
  onSelectPlace: (place: PlaceMarker) => void
}) {
  // Grouped by month so a long history has structure rather than being an
  // undifferentiated wall of rows.
  const groups: { month: string; items: TimelineVisit[] }[] = []
  for (const v of visits) {
    const m = v.visitedOn.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.month === m) last.items.push(v)
    else groups.push({ month: m, items: [v] })
  }

  return (
    <div className="pb-4">
      {groups.map(({ month, items }) => (
        <section key={month}>
          <h3 className="text-text-dim bg-surface-raised/50 sticky top-0 px-4 py-1.5 text-[11px] backdrop-blur-sm">
            {monthLabel(month)} · {items.length}{" "}
            {items.length === 1 ? "visit" : "visits"}
          </h3>
          <ul>
            {items.map((v) => {
              const Icon = CATEGORIES[v.category].icon
              const detail = [...v.dishes, ...v.activity].join(", ")
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectPlace({
                        id: v.placeId,
                        name: v.placeName,
                        lat: v.lat,
                        lng: v.lng,
                      } as PlaceMarker)
                    }
                    className="hover:bg-surface-raised border-line flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors"
                  >
                    <Icon className="text-text-dim mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="text-text block truncate text-sm">
                        {v.placeName}
                      </span>
                      <span className="text-text-dim block text-xs">
                        {dayLabel(v.visitedOn)}
                      </span>
                      {detail && (
                        <span className="text-text-dim mt-0.5 block truncate text-xs">
                          {detail}
                        </span>
                      )}
                      {v.companions.length > 0 && (
                        <span className="text-text-dim block text-xs">
                          with {v.companions.join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {v.rating != null && (
                        <span
                          className="font-display text-base tabular-nums"
                          style={{ color: ratingColor(v.rating) }}
                        >
                          {formatRating(v.rating)}
                        </span>
                      )}
                      {v.pricePaid != null && (
                        <span className="text-text-dim text-[11px] tabular-nums">
                          {money(v.pricePaid)}
                        </span>
                      )}
                      {v.photoCount > 0 && (
                        <span className="text-text-dim flex items-center gap-0.5 text-[11px]">
                          <Camera className="h-2.5 w-2.5" />
                          {v.photoCount}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Budget({ stats }: { stats: Stats }) {
  const { totals, spendByCategory, spendByMonth } = stats
  const withSpend = spendByCategory.filter((c) => c.total > 0)
  const max = Math.max(...withSpend.map((c) => c.total), 1)
  const logged = stats.visits.filter((v) => v.pricePaid != null).length

  return (
    <div className="space-y-5 px-4 py-4">
      <div>
        <p className="text-text-dim text-xs">Total logged spend</p>
        <p className="font-display text-text mt-0.5 text-3xl tabular-nums">
          {money(totals.totalSpend)}
        </p>
        <p className="text-text-dim mt-1 text-xs">
          across {logged} of {totals.visitCount}{" "}
          {totals.visitCount === 1 ? "visit" : "visits"}
          {logged < totals.visitCount && " that had a price recorded"}
        </p>
      </div>

      {withSpend.length > 0 && (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">By category</h3>
          <ul className="space-y-2.5">
            {withSpend.map(({ category, total, visits }) => {
              const Icon = CATEGORIES[category].icon
              return (
                <li key={category}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-text flex items-center gap-2 text-sm">
                      <Icon className="text-text-dim h-3.5 w-3.5" />
                      {CATEGORIES[category].label}
                    </span>
                    <span className="text-text text-sm tabular-nums">
                      {money(total)}
                    </span>
                  </div>
                  {/* A bar, not a pie. Comparing lengths is something people do
                      accurately; comparing angles is not. */}
                  <div className="bg-surface-raised h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${(total / max) * 100}%` }}
                    />
                  </div>
                  <p className="text-text-dim mt-0.5 text-[11px]">
                    {visits} {visits === 1 ? "visit" : "visits"} ·{" "}
                    {money(total / visits)} average
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {spendByMonth.length >= NEEDS.spendTrend ? (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">By month</h3>
          <ul className="space-y-1.5">
            {spendByMonth.map(({ month, total }) => {
              const mx = Math.max(...spendByMonth.map((m) => m.total), 1)
              return (
                <li key={month} className="flex items-center gap-2">
                  <span className="text-text-dim w-14 shrink-0 text-[11px]">
                    {monthLabel(month)}
                  </span>
                  <span className="bg-surface-raised h-4 flex-1 overflow-hidden rounded">
                    <span
                      className="bg-accent/70 block h-full rounded"
                      style={{ width: `${(total / mx) * 100}%` }}
                    />
                  </span>
                  <span className="text-text w-14 shrink-0 text-right text-[11px] tabular-nums">
                    {money(total)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="text-text-dim border-line rounded-xl border border-dashed px-3 py-2.5 text-xs leading-relaxed">
          Monthly spending appears once you have logged prices across at least
          two months.
        </p>
      )}
    </div>
  )
}

function Review({ stats }: { stats: Stats }) {
  const { totals, topPlaces, companions, ratingOverTime, visitsByCategory } = stats

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Visits" value={String(totals.visitCount)} />
        <Stat label="Places" value={String(totals.placeCount)} />
        <Stat
          label="Average rating"
          value={totals.avgRating != null ? formatRating(totals.avgRating) : "–"}
          color={totals.avgRating != null ? ratingColor(totals.avgRating) : undefined}
        />
        <Stat label="Photos" value={String(totals.photoCount)} />
      </div>

      {totals.firstVisitOn && (
        <p className="text-text-dim text-xs leading-relaxed">
          Your first logged visit was {dayLabel(totals.firstVisitOn)}.
        </p>
      )}

      {visitsByCategory.length > 1 && (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">What you do</h3>
          <ul className="space-y-1.5">
            {visitsByCategory.map(({ category, count }) => {
              const Icon = CATEGORIES[category].icon
              const mx = Math.max(...visitsByCategory.map((c) => c.count), 1)
              return (
                <li key={category} className="flex items-center gap-2">
                  <Icon className="text-text-dim h-3.5 w-3.5 shrink-0" />
                  <span className="text-text w-24 shrink-0 truncate text-xs">
                    {CATEGORIES[category].label}
                  </span>
                  <span className="bg-surface-raised h-3 flex-1 overflow-hidden rounded">
                    <span
                      className="bg-accent/70 block h-full rounded"
                      style={{ width: `${(count / mx) * 100}%` }}
                    />
                  </span>
                  <span className="text-text-dim w-5 shrink-0 text-right text-[11px] tabular-nums">
                    {count}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {topPlaces.length >= NEEDS.topPlaces ? (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">Your best</h3>
          <ul className="space-y-1.5">
            {topPlaces.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-text-dim w-4 shrink-0 text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className="text-text flex-1 truncate text-sm">{p.name}</span>
                <span
                  className="font-display shrink-0 text-sm tabular-nums"
                  style={{ color: ratingColor(p.avg) }}
                >
                  {formatRating(p.avg)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Pending>
          A ranking of your best places appears once you have rated at least{" "}
          {NEEDS.topPlaces}.
        </Pending>
      )}

      {companions.length >= NEEDS.companions ? (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">Who you go with</h3>
          <ul className="space-y-1.5">
            {companions.map((c) => (
              <li key={c.name} className="flex items-center gap-2">
                <span className="text-text flex-1 truncate text-sm">{c.name}</span>
                <span className="text-text-dim text-xs">
                  {c.visits} {c.visits === 1 ? "visit" : "visits"}
                </span>
                {c.avgRating != null && (
                  <span
                    className="font-display w-8 shrink-0 text-right text-sm tabular-nums"
                    style={{ color: ratingColor(c.avgRating) }}
                  >
                    {formatRating(c.avgRating)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Pending>
          Once you have logged visits with a couple of different people, this
          shows who you go out with most and how those visits rated.
        </Pending>
      )}

      {ratingOverTime.length >= NEEDS.ratingTrend ? (
        <div>
          <h3 className="text-text-dim mb-2 text-xs">How your ratings move</h3>
          <ul className="space-y-1.5">
            {ratingOverTime.map(({ month, avg, count }) => (
              <li key={month} className="flex items-center gap-2">
                <span className="text-text-dim w-14 shrink-0 text-[11px]">
                  {monthLabel(month)}
                </span>
                <span className="bg-surface-raised h-3 flex-1 overflow-hidden rounded">
                  <span
                    className="block h-full rounded"
                    style={{
                      width: `${(avg / 10) * 100}%`,
                      background: ratingColor(avg),
                    }}
                  />
                </span>
                <span
                  className="w-7 shrink-0 text-right text-[11px] tabular-nums"
                  style={{ color: ratingColor(avg) }}
                >
                  {formatRating(avg)}
                </span>
                <span className="text-text-dim w-6 shrink-0 text-right text-[10px]">
                  ({count})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Pending>
          Rating trends need visits across at least {NEEDS.ratingTrend} months.
          A line drawn through two points is not a trend.
        </Pending>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="border-line bg-surface-raised/40 rounded-xl border px-3 py-2.5">
      <p className="text-text-dim text-[11px]">{label}</p>
      <p
        className="font-display mt-0.5 text-xl tabular-nums"
        style={{ color: color ?? "var(--color-text)" }}
      >
        {value}
      </p>
    </div>
  )
}

// Sections say what they are waiting for rather than silently vanishing, so an
// empty page reads as "not yet" rather than "broken".
function Pending({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-dim border-line rounded-xl border border-dashed px-3 py-2.5 text-xs leading-relaxed">
      {children}
    </p>
  )
}
