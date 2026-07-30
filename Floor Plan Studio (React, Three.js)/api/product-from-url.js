import Anthropic from '@anthropic-ai/sdk';
import {
  MISSING_KEY_MESSAGE,
  PRODUCT_MODEL,
  PRODUCT_PROMPT,
  PRODUCT_SCHEMA,
  describeApiError,
  parseStructured,
} from './_shared.js';

export const config = { maxDuration: 120 };

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

function htmlToText(html) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return `${title}\n\n${body}`;
}

function findProductImage(html, pageUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /"hiRes"\s*:\s*"([^"]+)"/i,
    /"large"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      try {
        return new URL(m[1].replace(/\\u002F/g, '/'), pageUrl).href;
      } catch {
        // keep looking
      }
    }
  }
  return null;
}

/**
 * Serverless product import.
 *
 * NOTE: this uses a plain fetch, unlike the local dev server which drives a headless browser.
 * Vercel functions can't run Chromium within normal limits. Measured consequence: sites that
 * render product data server-side still work, but JS-only pages return little, and aggressive
 * anti-bot retailers (Amazon 404, Wayfair 429) are refused outright. The error below says so
 * plainly rather than silently returning a guessed product.
 */
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

  const { url } = req.body ?? {};
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Provide a full product URL starting with http(s)://' });
    return;
  }

  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    if (!pageRes.ok) {
      res.status(422).json({
        error:
          `That store returned HTTP ${pageRes.status} and blocked the request. Amazon and Wayfair ` +
          `block automated access. You can still add the item from the catalog and type its real size.`,
      });
      return;
    }
    const html = await pageRes.text();
    const text = htmlToText(html).slice(0, 14000);

    const content = [];
    let imageDataUrl = null;
    const imageUrl = findProductImage(html, url);
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': BROWSER_UA } });
        const type = (imgRes.headers.get('content-type') || '').split(';')[0];
        if (imgRes.ok && /^image\/(jpeg|png|webp)/.test(type)) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length > 1000 && buf.length < 5_000_000) {
            imageDataUrl = `data:${type};base64,${buf.toString('base64')}`;
            content.push({ type: 'image', source: { type: 'base64', media_type: type, data: buf.toString('base64') } });
          }
        }
      } catch {
        // image is a bonus
      }
    }
    content.push({ type: 'text', text: `${PRODUCT_PROMPT}\n\nPRODUCT PAGE TEXT:\n${text}` });

    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: PRODUCT_MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: PRODUCT_SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'Claude declined to read that page.' });
      return;
    }
    let parsed;
    try {
      parsed = parseStructured(response);
    } catch {
      res.status(502).json({ error: 'Could not read product details from that page.' });
      return;
    }
    res.status(200).json({ ...parsed, imageDataUrl, sourceUrl: url });
  } catch (err) {
    console.error('product-from-url error:', err);
    res.status(502).json({ error: describeApiError(err) });
  }
}
