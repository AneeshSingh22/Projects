import { createWorker } from 'tesseract.js';
import type { DetectedRoom } from './floorPlanVision';

export interface OcrTextBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

/** Runs OCR in a Tesseract.js worker (client-side, no server/API key) and returns line-level
 * text blocks with bounding boxes — line granularity keeps a dimension string like
 * `14'5" x 16'6"` together even when it's recognized as multiple words. */
export async function runOcr(image: HTMLImageElement, onProgress?: (fraction: number) => void): Promise<OcrTextBlock[]> {
  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  // Worker termination can hang in some environments; don't let it block returning results
  // that are already in hand — fire-and-forget the cleanup instead.
  try {
    const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
    const blocks: OcrTextBlock[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          const text = line.text.trim();
          if (text) blocks.push({ text, bbox: line.bbox, confidence: line.confidence });
        }
      }
    }
    void worker.terminate().catch(() => {});
    return blocks;
  } catch (err) {
    void worker.terminate().catch(() => {});
    throw err;
  }
}

// Inch-mark class covers straight ("), prime (″), and both curly double-quote variants (" ") —
// documents typeset with "smart quotes" render the inch mark as a curly right double-quote, not
// a straight one, and OCR preserves whichever the source used.
const INCH_MARK = '["″“”]';
const FOOT_MARK = "['’′‘`]";

const STRICT_DIMENSION_RE = new RegExp(
  `(\\d{1,2})\\s*${FOOT_MARK}\\s*-?\\s*(\\d{1,2})?\\s*${INCH_MARK}?\\s*[xX×]\\s*(\\d{1,2})\\s*${FOOT_MARK}\\s*-?\\s*(\\d{1,2})?\\s*${INCH_MARK}?`,
);

// OCR very often drops the thin foot-mark (') entirely while keeping the inch-mark ("), turning
// `14'0" x 8'4"` into `140" x 84"` — this loose pattern catches two bare digit runs each still
// followed by an inch-mark, and `splitFeetInches` below re-derives the feet/inches split.
const LOOSE_DIMENSION_RE = new RegExp(`(\\d{2,4})\\s*${INCH_MARK}\\s*[xX×]\\s*(\\d{2,4})\\s*${INCH_MARK}`);

/** Splits a bare digit run (foot-mark already lost to OCR) back into feet+inches. Empirically the
 * correct split is always `floor(length/2)` digits of inches — e.g. "109" -> 10'9", "84" -> 8'4",
 * "1411" -> 14'11" — trying multiple splits and taking the first "plausible" one is tempting but
 * wrong: "109" split as 1-digit-inches also looks plausible (1'09"=21in) and is simply incorrect. */
function splitFeetInches(digits: string): number | null {
  if (digits.length <= 1) {
    const feet = Number(digits);
    return feet >= 1 && feet <= 40 ? feet * 12 : null;
  }
  const inchLen = Math.floor(digits.length / 2);
  const feet = Number(digits.slice(0, digits.length - inchLen));
  const inches = Number(digits.slice(digits.length - inchLen));
  if (inches <= 11 && feet >= 1 && feet <= 40) return feet * 12 + inches;
  return null;
}

function inRange(...values: number[]): boolean {
  return values.every((v) => v >= 12 && v <= 600);
}

/** Parses printed dimension strings like `14'5" x 16'6"`, `14'-5" X 16'-6"`, `9'2" x 17'3"` —
 * and, via a looser fallback pattern, the same strings with a dropped/misread foot-mark. */
export function parseDimensionText(text: string): { widthIn: number; depthIn: number } | null {
  const strict = text.match(STRICT_DIMENSION_RE);
  if (strict) {
    const widthIn = Number(strict[1]) * 12 + Number(strict[2] ?? 0);
    const depthIn = Number(strict[3]) * 12 + Number(strict[4] ?? 0);
    if (inRange(widthIn, depthIn)) return { widthIn, depthIn };
  }
  const loose = text.match(LOOSE_DIMENSION_RE);
  if (loose) {
    const widthIn = splitFeetInches(loose[1]);
    const depthIn = splitFeetInches(loose[2]);
    if (widthIn && depthIn && inRange(widthIn, depthIn)) return { widthIn, depthIn };
  }
  return null;
}

export interface RoomTextMatch {
  name?: string;
  widthIn?: number;
  depthIn?: number;
}

/** Associates OCR text blocks to whichever detected room's pixel bounding box contains them —
 * the first parseable dimension string becomes that room's size, the first plausible label-like
 * text becomes its name. */
export function associateTextToRooms(ocrBlocks: OcrTextBlock[], rooms: DetectedRoom[]): RoomTextMatch[] {
  return rooms.map((room) => {
    const inside = ocrBlocks.filter((b) => {
      const bx = (b.bbox.x0 + b.bbox.x1) / 2;
      const by = (b.bbox.y0 + b.bbox.y1) / 2;
      return bx >= room.bboxPx.minX && bx <= room.bboxPx.maxX && by >= room.bboxPx.minY && by <= room.bboxPx.maxY;
    });
    let dims: { widthIn: number; depthIn: number } | undefined;
    let name: string | undefined;
    for (const block of inside) {
      const parsed = parseDimensionText(block.text);
      if (parsed && !dims) {
        dims = parsed;
      } else if (!parsed && !name && /[a-zA-Z]{3,}/.test(block.text)) {
        name = block.text;
      }
    }
    return { name, ...dims };
  });
}
