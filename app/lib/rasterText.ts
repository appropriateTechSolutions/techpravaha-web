/**
 * Rasterise display text to a PNG data URL: black glyphs on a transparent
 * ground, the input MetallicPaint's processImage expects (it derives the shape
 * from alpha). Async because it waits for webfonts and, on OffscreenCanvas,
 * encodes via convertToBlob. Returns null when no 2D canvas is available.
 *
 * Geometry matches a CSS line box: each line gets `lineHeight` px, with the
 * glyphs placed on the CSS baseline (half-leading above the font ascent), and
 * the whole block is inset by `padding` on every side. The output's CSS size is
 * (min(widest line, maxWidth) + 2 * padding) by (lines * lineHeight + 2 * padding);
 * the bitmap is that times devicePixelRatio, capped at 2.
 */
export interface RasterTextOptions {
  /** Lines separated by \n. */
  text: string;
  /** Canvas font shorthand, e.g. `600 124px "Bricolage Grotesque Variable"`. */
  font: string;
  /** Line height in CSS px. */
  lineHeight: number;
  /** Upper bound for the drawn width in CSS px. */
  maxWidth: number;
  /** Transparent inset on every side in CSS px (room for overhangs). */
  padding?: number;
  /** CSS letter-spacing, e.g. `-5.5px`, applied where the canvas supports it. */
  letterSpacing?: string;
}

export interface RasterTextResult {
  url: string;
  /** CSS px size of the image, padding included. */
  width: number;
  height: number;
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Ctx2D } | null {
  try {
    if (typeof OffscreenCanvas === 'function') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (ctx) return { canvas, ctx };
    }
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return ctx ? { canvas, ctx } : null;
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function applyFont(ctx: Ctx2D, font: string, letterSpacing?: string) {
  ctx.font = font;
  // letterSpacing is newer than the rest of the 2D API; skip it where absent.
  if (letterSpacing && 'letterSpacing' in ctx) {
    (ctx as Ctx2D & { letterSpacing: string }).letterSpacing = letterSpacing;
  }
}

/** Same as rasterText, plus the CSS size of the image. */
export async function rasterTextImage(opts: RasterTextOptions): Promise<RasterTextResult | null> {
  const { text, font, lineHeight, maxWidth, padding = 0, letterSpacing } = opts;
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Draw with whatever font is available.
    }
  }

  const lines = text.split('\n');
  const probe = makeCanvas(1, 1);
  if (!probe) return null;
  applyFont(probe.ctx, font, letterSpacing);
  const measured = Math.max(...lines.map((l) => probe.ctx.measureText(l).width));
  const metrics = probe.ctx.measureText(lines.join(''));

  const textWidth = Math.min(Math.ceil(measured), maxWidth);
  const width = textWidth + padding * 2;
  const height = Math.ceil(lines.length * lineHeight + padding * 2);
  const dpr = Math.min(typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1, 2);

  const target = makeCanvas(Math.round(width * dpr), Math.round(height * dpr));
  if (!target) return null;
  const { canvas, ctx } = target;
  ctx.scale(dpr, dpr);
  applyFont(ctx, font, letterSpacing);
  ctx.fillStyle = 'black';

  // CSS puts the baseline half-leading + ascent below the line box top.
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const hasFontBox = Number.isFinite(ascent) && Number.isFinite(descent) && ascent + descent > 0;
  ctx.textBaseline = hasFontBox ? 'alphabetic' : 'middle';
  lines.forEach((line, i) => {
    const top = padding + i * lineHeight;
    const y = hasFontBox ? top + (lineHeight - (ascent + descent)) / 2 + ascent : top + lineHeight / 2;
    ctx.fillText(line, padding, y, maxWidth);
  });

  try {
    const url =
      'convertToBlob' in canvas
        ? await blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' }))
        : canvas.toDataURL('image/png');
    return url.startsWith('data:image/png') ? { url, width, height } : null;
  } catch {
    return null;
  }
}

/** Rasterise `text` to a PNG data URL (black on transparent), or null without a canvas. */
export async function rasterText(opts: RasterTextOptions): Promise<string | null> {
  return (await rasterTextImage(opts))?.url ?? null;
}
