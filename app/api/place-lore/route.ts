import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// "What is this place known for?" for somewhere you have not been yet.
//
// WHAT THIS IS AND IS NOT
//
// This is the model's recollection from training data. It is NOT review data,
// it is not current, and it is not verified. Google does sell exactly this -
// reviewSummary and generativeSummary on Places API - but those sit in the
// Enterprise tier that plan.md section 6 identifies as the one realistic way
// this project gets billed, and the quota caps set during setup block them.
// Yelp closed its free API to new developers; Foursquare's coverage of small
// neighbourhood places is thin; OpenStreetMap has no review data at all.
//
// So this is the honest free option, and its limits are real. Tested against
// actual places in this database: it is accurate on well-known venues, and it
// correctly refuses on invented names. But it claimed high confidence on Gogi
// Yogi, a small Shaw restaurant it is unlikely to genuinely know - so the UI
// must always present this as recollection rather than fact, and the answer is
// only shown when the model says it knows the place.
//
// Cached in the database after the first lookup: a place's reputation does not
// change hour to hour, and re-asking on every sheet open would waste quota on
// an answer that will not differ.

const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3-flash-preview"]

const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  propertyOrdering: ["known", "confidence", "knownFor", "popular"],
  properties: {
    known: { type: "BOOLEAN" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    knownFor: { type: "STRING" },
    popular: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["known", "confidence"],
} as const

export type PlaceLore = {
  known: boolean
  confidence: "high" | "medium" | "low"
  knownFor?: string
  popular?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 })
  }

  let placeId = ""
  try {
    const body = await request.json()
    placeId = String(body.placeId ?? "")
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 })
  }
  if (!placeId) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 })
  }

  const { data: place } = await supabase
    .from("places")
    .select("id, name, address, city, cuisine, lore, lore_at")
    .eq("id", placeId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!place) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  }

  // Already looked up. Reputation is stable, so this is served from the row
  // rather than spending a request to be told the same thing.
  if (place.lore) {
    return NextResponse.json({ ok: true, lore: place.lore as PlaceLore, cached: true })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
  }

  const descriptor = [place.name, place.address ?? place.city]
    .filter(Boolean)
    .join(" — ")

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: descriptor }] }],
    systemInstruction: {
      parts: [
        {
          text:
            `You recall what a specific venue is known for. ` +
            `Only answer if you genuinely recognise this exact place. ` +
            `Do NOT guess from the name or the cuisine type. ` +
            `If you do not specifically recall it, set known=false and leave ` +
            `the lists empty. ` +
            `popular: up to four things people commonly order or do there. ` +
            `knownFor: one short phrase. ` +
            `confidence: high only for well-known places you are certain about.`,
        },
      ],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  })

  const deadline = Date.now() + 10_000
  const attempts: string[] = []

  for (const model of MODELS) {
    const remaining = deadline - Date.now()
    if (remaining <= 500) break

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), remaining)
      const res = await fetch(endpointFor(model), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: requestBody,
      })
      clearTimeout(timer)

      if (!res.ok) {
        attempts.push(`${model}: HTTP ${res.status}`)
        if (res.status === 400 || res.status === 401 || res.status === 403) break
        continue
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof raw !== "string") {
        attempts.push(`${model}: no text`)
        continue
      }

      const lore = JSON.parse(raw) as PlaceLore

      // Stored even when known=false, so a place the model does not recognise
      // is not re-asked every time the sheet opens.
      await supabase
        .from("places")
        .update({ lore, lore_at: new Date().toISOString() })
        .eq("id", place.id)
        .eq("user_id", user.id)

      return NextResponse.json({ ok: true, lore, cached: false })
    } catch (e) {
      attempts.push(`${model}: ${e instanceof Error ? e.name : "threw"}`)
      continue
    }
  }

  console.error("[place-lore] all models failed:", attempts)
  return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 })
}
