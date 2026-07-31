import Anthropic from '@anthropic-ai/sdk';
import {
  MISSING_KEY_MESSAGE,
  MODEL,
  STYLE_EFFORT,
  STYLE_PROMPT,
  STYLE_SCHEMA,
  describeApiError,
  parseStructured,
} from './_shared.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const apiKey = req.headers['x-anthropic-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: MISSING_KEY_MESSAGE });
    return;
  }

  const { images } = req.body ?? {};
  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'Missing images in request body.' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: STYLE_EFFORT, format: { type: 'json_schema', schema: STYLE_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            ...images.slice(0, 6).map((img) => ({
              type: 'image',
              source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data },
            })),
            { type: 'text', text: STYLE_PROMPT },
          ],
        },
      ],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'Claude declined to analyze these photos.' });
      return;
    }

    let parsed;
    try {
      parsed = parseStructured(response);
    } catch {
      res.status(502).json({ error: 'Could not read a style profile from those photos.' });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    console.error('extract-style error:', err);
    res.status(502).json({ error: describeApiError(err) });
  }
}
