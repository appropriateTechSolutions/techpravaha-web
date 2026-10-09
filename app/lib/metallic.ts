import { rasterTextImage } from './rasterText';

/** Below this viewport width the hero keeps its static chrome text. */
export const METALLIC_MIN_WIDTH = 768;

/** Transparent inset around the rasterised tagline, as a fraction of the font size (room for overhangs). */
const RASTER_PADDING_EM = 0.15;

/**
 * Whether the liquid-chrome shader may run here: a browser with webgl2, motion
 * allowed, no forced colours, a viewport at least 768px wide and (where
 * reported) 4GB+ of memory. Cheap checks run first; the webgl2 probe context is
 * released straight away.
 */
export function canRunMetallic(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    if (typeof window.matchMedia === 'function') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (window.matchMedia('(forced-colors: active)').matches) return false;
    }
    if (window.innerWidth < METALLIC_MIN_WIDTH) return false;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory < 4) return false;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export interface MetallicRaster {
  url: string;
  /** CSS px size of the image, padding included. */
  width: number;
  height: number;
  /** CSS px inset on every side; the overlay sits this far up and left of the H1. */
  padding: number;
}

/** Rasterise `lines` in the H1's own computed type, or null when the canvas would not match it. */
export async function rasterFor(h1: HTMLElement, lines: string[]): Promise<MetallicRaster | null> {
  // Measure only once the display face is in; a fallback font gives the wrong box.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Measure with whatever is loaded.
    }
  }
  const cs = getComputedStyle(h1);
  const fontSize = parseFloat(cs.fontSize);
  if (!Number.isFinite(fontSize) || fontSize <= 0) return null;
  const box = h1.getBoundingClientRect();
  const lineHeight = parseFloat(cs.lineHeight) || box.height / lines.length;
  // If the browser wrapped the tagline onto more lines than we draw, the canvas would not match.
  if (Math.abs(box.height - lines.length * lineHeight) > lineHeight / 2) return null;
  const padding = Math.ceil(fontSize * RASTER_PADDING_EM);
  const letterSpacing = cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : undefined;
  const img = await rasterTextImage({
    text: lines.join('\n'),
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    lineHeight,
    maxWidth: Math.max(1, Math.floor(box.width)),
    padding,
    letterSpacing,
  });
  return img ? { ...img, padding } : null;
}
