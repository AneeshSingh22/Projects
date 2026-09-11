import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Natural language visit logging - plan.md section 9, Phase 5.
//
// GEMINI_API_KEY is server-only and never reaches the browser, which is why
// this is a route rather than a client call (section 4.4).
//
// Model choice: plan.md section 3 says "Gemini 3 Flash". The key's model list
// offers gemini-3-flash-preview, but preview models get retired.
// gemini-flash-latest is a stable alias that resolves to the current flash
// model and produced identical output on the plan's own example sentence, so
// it is used instead. gemini-3.8-flash was also tried and returned 503 "high
// demand" - a good illustration of why the fallback below is mandatory.
const MODEL = "gemini-flash-latest"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Plain fetch, no SDK. HANDOFF 5b: @google/genai was declined because one call
// site does not justify a dependency, and this is about thirty lines.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    placeName: { type: "STRING" },
    visitedOn: { type: "STRING" },
    rating: { type: "NUMBER" },
    dishes: { type: "ARRAY", items: { type: "STRING" } },
    companions: { type: "ARRAY", items: { type: "STRING" } },
    pricePaid: { type: "NUMBER" },
    wouldReturn: { type: "BOOLEAN" },
    occasion: { type: "STRING" },
    notes: { type: "STRING" },
  },
} as const

export type ParsedVisit = {
  placeName?: string
  visitedOn?: string
  rating?: number
  dishes?: string[]
  companions?: string[]
  pricePaid?: number
  wouldReturn?: boolean
  occasion?: string
  notes?: string
}

function todayISO(tzOffsetMinutes: number): string {
  const now = new Date()
  return new Date(now.getTime() - tzOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10)
}

export async function POST(request: NextRequest) {
  // Authenticated: this spends a shared quota, so it is not an open endpoint.
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

  let text = ""
  let tzOffset = 0
  try {
    const body = await request.json()
    text = String(body.text ?? "").slice(0, 1000)
    tzOffset = Number(body.tzOffsetMinutes ?? 0)
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 200 })
  }

  try {
    // Aborted rather than left hanging: section 9 says the app must never block
    // on Gemini, and a request with no timeout is exactly how that happens.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        systemInstruction: {
          parts: [
            {
              text:
                `Extract restaurant visit details from the user's note. ` +
                `Today is ${todayISO(tzOffset)}. ` +
                `Dates must be YYYY-MM-DD; resolve relative dates like "last Friday" against today. ` +
                `Rating is out of 10. ` +
                `Omit any field the note does not mention - do not invent values. ` +
                `Put anything descriptive that is not a dish, companion, price or rating into notes.`,
            },
          ],
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Deterministic: this is extraction, not writing. The same sentence
          // should always yield the same fields.
          temperature: 0,
        },
      }),
    })

    clearTimeout(timeout)

    if (!res.ok) {
      // Rate limits and 503s are expected and routine on the free tier. The
      // client falls back to the empty manual form.
      return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof raw !== "string") {
      return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
    }

    const parsed = JSON.parse(raw) as ParsedVisit
    return NextResponse.json({ ok: true, parsed })
  } catch {
    // Timeout, network failure, or malformed JSON all land here and all mean
    // the same thing to the user: fill the form in yourself.
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
  }
}
