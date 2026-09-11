import type { Deal } from "@/types/db"

// Deciding whether a deal is running right now.
//
// All of this is local wall-clock reasoning on purpose. A happy hour is
// "16:00-18:00 wherever the restaurant is", not an instant in time, which is
// why the times are stored without a zone.

export type DealStatus =
  | { state: "active"; endsInMinutes: number | null }
  | { state: "later_today"; startsInMinutes: number }
  | { state: "another_day"; nextDayLabel: string }
  | { state: "expired" }

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

// ISO weekday: 1 = Monday ... 7 = Sunday. JS getDay() is 0 = Sunday, which is
// a classic off-by-one source, so the conversion is done once here.
export function isoWeekday(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 7 : js
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

// "16:30:00" -> 990
function parseTime(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export function dealStatus(deal: Deal, now: Date = new Date()): DealStatus {
  if (deal.expires_on) {
    const today = new Date(
      now.getTime() - now.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 10)
    if (deal.expires_on < today) return { state: "expired" }
  }

  const days = deal.days ?? []
  const runsEveryDay = days.length === 0
  const today = isoWeekday(now)
  const runsToday = runsEveryDay || days.includes(today)

  const start = parseTime(deal.starts_at)
  const end = parseTime(deal.ends_at)
  const nowMin = minutesOfDay(now)

  // No times means all day on its days.
  if (start == null || end == null) {
    if (runsToday) return { state: "active", endsInMinutes: null }
    return { state: "another_day", nextDayLabel: nextDay(days, today) }
  }

  // A window that ends before it starts crosses midnight - "22:00 to 02:00".
  // Treated as two spans so a late-night deal is not reported as inactive for
  // the entire evening it is actually running.
  const crossesMidnight = end < start

  if (crossesMidnight) {
    const inLateSpan = runsToday && nowMin >= start
    // The early-morning tail belongs to yesterday's occurrence.
    const yesterdayRan = runsEveryDay || days.includes(today === 1 ? 7 : today - 1)
    const inEarlySpan = yesterdayRan && nowMin < end

    if (inLateSpan) return { state: "active", endsInMinutes: 24 * 60 - nowMin + end }
    if (inEarlySpan) return { state: "active", endsInMinutes: end - nowMin }
    if (runsToday && nowMin < start) {
      return { state: "later_today", startsInMinutes: start - nowMin }
    }
    return { state: "another_day", nextDayLabel: nextDay(days, today) }
  }

  if (runsToday && nowMin >= start && nowMin < end) {
    return { state: "active", endsInMinutes: end - nowMin }
  }
  if (runsToday && nowMin < start) {
    return { state: "later_today", startsInMinutes: start - nowMin }
  }
  return { state: "another_day", nextDayLabel: nextDay(days, today) }
}

function nextDay(days: number[], today: number): string {
  if (days.length === 0) return "tomorrow"
  for (let i = 1; i <= 7; i++) {
    const d = ((today - 1 + i) % 7) + 1
    if (days.includes(d)) return DAY_LABELS[d - 1]
  }
  return "later"
}

// "Tue, Thu" / "Every day" / "Weekends"
export function describeDays(days: number[] | null): string {
  const d = days ?? []
  if (d.length === 0 || d.length === 7) return "Every day"
  const sorted = [...d].sort((a, b) => a - b)
  if (sorted.join() === "6,7") return "Weekends"
  if (sorted.join() === "1,2,3,4,5") return "Weekdays"
  return sorted.map((n) => DAY_LABELS[n - 1].slice(0, 3)).join(", ")
}

// "4:00 – 6:00 pm"
export function describeWindow(
  starts: string | null,
  ends: string | null,
): string | null {
  if (!starts || !ends) return null
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    const suffix = h >= 12 ? "pm" : "am"
    const hour = h % 12 === 0 ? 12 : h % 12
    return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`
  }
  return `${fmt(starts)} – ${fmt(ends)}`
}
