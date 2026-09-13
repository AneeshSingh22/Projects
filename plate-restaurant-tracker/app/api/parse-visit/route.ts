import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Natural language visit logging - plan.md section 9, Phase 5.
//
// GEMINI_API_KEY is server-only and never reaches the browser, which is why
// this is a route rather than a client call (section 4.4).
//
// Model order matters and was measured, not guessed.
//
// gemini-3-flash-preview used to be first and is heavily rate limited on the
// free tier. Every request waited for it to return 429 before falling through
// to a working model, which is what made this feel slow. It is kept last as a
// backstop rather than removed, since availability shifts.
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
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
]

const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

// Plain fetch, no SDK. HANDOFF 5b: @google/genai was declined because one call
// site does not justify a dependency, and this is about thirty lines.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  // Forces the model to consider every key in this order rather than emitting
  // whichever subset it decides is enough. Without it, longer and more natural
  // notes silently lost fields - a paragraph mentioning a rating, a companion
  // and a price would come back with only one of the three.
  propertyOrdering: [
    "placeName",
    "visitedOn",
    "rating",
    "dishes",
    "activity",
    "companions",
    "pricePaid",
    "wouldReturn",
    "notes",
  ],
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

  // Kept deliberately SHORT. A longer, more emphatic prompt was tried first -
  // one that walked through each field explaining what to look for - and it
  // made extraction measurably WORSE, dropping companions and prices that the
  // short version catches every time. Instructions compete with the note for
  // the model's attention; the schema already says what the fields are.
  const requestBody = JSON.stringify({
        contents: [{ parts: [{ text }] }],
        systemInstruction: {
          parts: [
            {
              text:
                `Extract visit details from the note. ` +
                `Today is ${todayISO(tzOffset)}. ` +
                `Ratings are 0-10; accept forms like "9/10" or "solid 9". ` +
                `Prices are dollars as a plain number. ` +
                `Resolve relative dates against today. ` +
                `dishes is for food ordered; activity is for what was done ` +
                `somewhere not about food. ` +
                `notes holds only the leftover description - never a rating, ` +
                `person, price or date. ` +
                `Omit fields the note does not mention.`,
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

  // Why each attempt failed. Returned to the client in development and always
  // logged, because "unavailable" on its own is unactionable - it cannot
  // distinguish a rate limit from a bad request from a parse failure, which is
  // exactly the ambiguity that made this hard to diagnose.
  const attempts: string[] = []

  for (const model of MODELS) {
    const remaining = deadline - Date.now()
    if (remaining <= 500) {
      attempts.push(`${model}: skipped, deadline exhausted`)
      break
    }

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
        const body = await res.text().catch(() => "")
        attempts.push(`${model}: HTTP ${res.status} ${body.slice(0, 140)}`)
        if (res.status === 400 || res.status === 401 || res.status === 403) break
        continue
      }

      const data = await res.json()
      const candidate = data?.candidates?.[0]
      const raw = candidate?.content?.parts?.[0]?.text

      if (typeof raw !== "string") {
        // A candidate with no text usually means the response was cut off or
        // filtered, and finishReason says which. MAX_TOKENS in particular is a
        // silent killer: the model starts valid JSON, runs out of room, and
        // returns a fragment that cannot be parsed.
        attempts.push(
          `${model}: no text (finishReason=${candidate?.finishReason ?? "none"})`,
        )
        continue
      }

      try {
        return NextResponse.json({ ok: true, parsed: JSON.parse(raw) as ParsedVisit })
      } catch {
        attempts.push(`${model}: unparseable JSON: ${raw.slice(0, 140)}`)
        continue
      }
    } catch (e) {
      attempts.push(
        `${model}: ${e instanceof Error ? e.name + " " + e.message : "threw"}`,
      )
      continue
    }
  }

  // Every model failed. The client falls back to the empty manual form with
  // the user's typed text preserved in notes.
  console.error("[parse-visit] all models failed:", attempts)
  return NextResponse.json(
    {
      ok: false,
      error: "unavailable",
      ...(process.env.NODE_ENV === "development" ? { attempts } : {}),
    },
    { status: 200 },
  )
}
