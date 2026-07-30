import Anthropic from '@anthropic-ai/sdk';
import {
  FLOOR_PLAN_EFFORT,
  MISSING_KEY_MESSAGE,
  MODEL,
  PROMPT,
  ROOM_SCHEMA,
  describeApiError,
  parseStructured,
} from './_shared.js';

export const config = {
  // Floor plan analysis at high effort routinely runs past a minute. Vercel's default function
  // timeout would abort it mid-flight; 300s is the Pro ceiling and comfortably covers it.
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  // The key travels per-request from the user's browser — the deployment holds none of its own,
  // so no visitor can spend the deployer's credit.
  const apiKey = req.headers['x-anthropic-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: MISSING_KEY_MESSAGE });
    return;
  }

  const { imageBase64, mediaType } = req.body ?? {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      output_config: {
        effort: FLOOR_PLAN_EFFORT,
        format: { type: 'json_schema', schema: ROOM_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'Claude declined to analyze this image. Try a clearer floor plan.' });
      return;
    }

    let parsed;
    try {
      parsed = parseStructured(response);
    } catch {
      res.status(502).json({
        error:
          response.stop_reason === 'max_tokens'
            ? 'Claude ran out of output space on this plan. Try a lower-resolution image.'
            : 'Claude returned a response that could not be parsed as room data.',
      });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error('analyze-floor-plan error:', err);
    res.status(502).json({ error: describeApiError(err) });
  }
}
