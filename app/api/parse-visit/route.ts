import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Natural language visit logging - plan.md section 9, Phase 5.
//
// GEMINI_API_KEY is server-only and never reaches the browser, which is why
// this is a route rather than a client call (section 4.4).
//
// Model choice, revised after testing rather than from the docs.
//
// plan.md section 3 says "Gemini 3 Flash". The first attempt here used
// gemini-flash-latest, reasoning that a stable alias outlives a preview model.
// Sound reasoning, wrong conclusion: that alias failed to connect on every
// attempt while two concrete model names succeeded on every attempt.
//
// Testing also found gemini-2.5-flash returning 404 "no longer available" -
// a model that was listed as available days earlier. Model names on this API
// come and go, which is the real lesson.
//
// So: a list, tried in order, rather than a single name. If the first has been
// retired or is overloaded, the next is tried. Only after all of them fail does
// the caller fall back to the manual form.
const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
]

const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

// Plain fetch, no SDK. HANDOFF 5b: @google/genai was declined because one call
// site does not justify a dependency, and this is about thirty lines.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    placeName: { type: "STRING" },
    visitedOn: { type: "STRING" },
    rating: { type: "NUMBER" },
    dishes: { type: "ARRAY", items: { type: "STRING" } },
    activity: { type: "ARRAY", items: { type: "STRING" } },
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
  activity?: string[]
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

  // Shared across attempts so the whole operation is bounded, not each try.
  // Section 9: the app must never block on Gemini.
  const deadline = Date.now() + 12_000

  const requestBody = JSON.stringify({
        contents: [{ parts: [{ text }] }],
        systemInstruction: {
          parts: [
            {
              text:
                `Extract details of a visit to a place from the user's note. ` +
                `The place may be a restaurant, a venue, a court or gym, a park, ` +
                `or anything else - do not assume it is a meal. ` +
                `Today is ${todayISO(tzOffset)}. ` +
                `Dates must be YYYY-MM-DD; resolve relative dates like "last Friday" against today. ` +
                `Rating is out of 10. ` +
                `Omit any field the note does not mention - do not invent values. ` +
                `dishes is for food ordered; activity is for what was done ` +
                `somewhere that is not a restaurant. Use one or the other, not both. ` +
                `Put anything descriptive that does not fit a field into notes.`,
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

      // 404 means the model was retired; 503 means it is overloaded. Both are
      // worth trying the next model for. A 400 means our request is wrong, and
      // retrying it against another model would fail identically.
      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) break
        continue
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof raw !== "string") continue

      return NextResponse.json({ ok: true, parsed: JSON.parse(raw) as ParsedVisit })
    } catch {
      // Timeout or network failure on this model. Try the next one if there is
      // time left on the shared deadline.
      continue
    }
  }

  // Every model failed. The client falls back to the empty manual form with
  // the user's typed text preserved in notes.
  return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
}
