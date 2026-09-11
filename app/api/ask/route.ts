import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Natural language querying - plan.md section 11 names this as a good idea for
// a later phase. This is that phase.
//
// The critical design decision: the model never sees your data and never
// returns results. It only translates a question into a set of filters, which
// are then applied locally to the places already in memory.
//
// That matters for three reasons:
//   1. Correctness. A model asked to "find matching restaurants" will invent
//      plausible ones. A model asked to emit {minRating: 7, category: "food_drink"}
//      either produces valid filters or fails visibly.
//   2. Privacy. Free-tier prompts may be used to improve Google's models
//      (plan.md section 9). Sending a question is fine; sending years of
//      personal notes is a different proposition.
//   3. Cost and speed. The payload is one sentence rather than the whole
//      database, every time.

const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
]

const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

// Mirrors lib/search/filters.ts. Kept as a plain schema here because the API
// needs its own type vocabulary.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    categories: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: ["food_drink", "entertainment", "sports", "outdoors", "other"],
      },
    },
    minRating: { type: "NUMBER" },
    maxRating: { type: "NUMBER" },
    maxPrice: { type: "NUMBER" },
    companions: { type: "ARRAY", items: { type: "STRING" } },
    nearMe: { type: "BOOLEAN" },
    unvisitedOnly: { type: "BOOLEAN" },
    visitedOnly: { type: "BOOLEAN" },
    sinceDaysAgo: { type: "NUMBER" },
    summary: { type: "STRING" },
  },
  required: ["summary"],
} as const

export type SearchFilters = {
  // Free text matched against name, notes, dishes and activity.
  text?: string
  categories?: string[]
  minRating?: number
  maxRating?: number
  maxPrice?: number
  companions?: string[]
  nearMe?: boolean
  unvisitedOnly?: boolean
  visitedOnly?: boolean
  sinceDaysAgo?: number
  // Plain-language restatement, shown back so the user can see what was
  // understood rather than guessing why results look odd.
  summary: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
  }

  let question = ""
  try {
    const body = await request.json()
    question = String(body.question ?? "").slice(0, 400)
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 })
  }

  if (!question.trim()) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 200 })
  }

  const deadline = Date.now() + 10_000

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: question }] }],
    systemInstruction: {
      parts: [
        {
          text:
            `Translate a question about someone's personal log of places they have ` +
            `visited into search filters. Return filters only - you cannot see their ` +
            `data and must never guess at place names or results.\n\n` +
            `Ratings are 0-10 where 10 is best. "liked" or "good" means minRating 7. ` +
            `"loved", "favourite" or "best" means minRating 8.5. ` +
            `"bad" or "did not like" means maxRating 4.\n` +
            `"cheap" means maxPrice 20. "expensive" means no maxPrice.\n` +
            `"want to try", "haven't been" or "wishlist" means unvisitedOnly true.\n` +
            `"been to" or "visited" means visitedOnly true.\n` +
            `"near here", "around here", "nearby" or "close by" means nearMe true.\n` +
            `Cuisine words, dish names and any other descriptive term go in text.\n` +
            `Names of people go in companions.\n` +
            `Omit every field the question does not imply. Do not invent constraints.\n\n` +
            `summary is a short plain restatement of what you understood, ` +
            `written in sentence case, for example "Food and drink you rated 7 or higher, near you".`,
        },
      ],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  })

  for (const model of MODELS) {
    const remaining = deadline - Date.now()
    if (remaining <= 500) break

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), remaining)

      const res = await fetch(endpointFor(model), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: requestBody,
      })

      clearTimeout(timer)

      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) break
        continue
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof raw !== "string") continue

      return NextResponse.json({
        ok: true,
        filters: JSON.parse(raw) as SearchFilters,
      })
    } catch {
      continue
    }
  }

  return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
}
