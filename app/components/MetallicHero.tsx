import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ChromeText } from './ChromeText';
import type { MetallicPaintProps } from './MetallicPaint';
import { whenIdle } from '../lib/idle';
import { canRunMetallic, METALLIC_MIN_WIDTH, rasterFor } from '../lib/metallic';
import type { MetallicRaster } from '../lib/metallic';
import { useHydrated } from '../lib/motion';

/** Stands in when the shader chunk fails to load: reports the failure so the hero keeps its text. */
function PaintUnavailable({ onError }: MetallicPaintProps) {
  useEffect(() => {
    onError?.();
  }, [onError]);
  return null;
}

// The shader lives in its own chunk, fetched only once the hero decides to run it.
// A failed fetch must never reach the route's error boundary.
const MetallicPaint = lazy<ComponentType<MetallicPaintProps>>(() =>
  import('./MetallicPaint').catch(() => ({ default: PaintUnavailable })),
);

/**
 * Shader colours, passed as uniforms (WebGL takes values, not CSS variables).
 * They mirror the tokens in app/theme.css: highlights = the #fff and #5b5f6e
 * stops of the dark --chrome; shadows = dark --ground and the first stop of the
 * light --chrome; tint = dark --ink-2. Keep in step with that file; this object
 * is the one justified exception to "no hex outside theme.css".
 * Light theme needs the darker highlight: with white, the shader's highlight
 * bands land near the light ground and whole words fade out.
 */
const PAINT = {
  lightColorOnDark: '#FFFFFF',
  lightColorOnLight: '#5B5F6E',
  darkColorOnDark: '#0A0A0C',
  darkColorOnLight: '#2A2D36',
  tintColor: '#C9CCD6',
  speed: 0.25,
  liquid: 0.6,
  refraction: 0.012,
  contrast: 0.55,
  brightness: 1.9,
} as const;

const RESIZE_DEBOUNCE_MS = 200;

function readIsLight(): boolean {
  return document.documentElement.classList.contains('light');
}

interface MetallicHeroProps {
  /** The tagline as plain lines, the raster input. Must match the lines in `children`. */
  lines: string[];
  /** The H1 content (text with <br />). */
  children: ReactNode;
}

/**
 * The hero tagline. The H1 is always rendered as chrome-gradient text (in the
 * prerendered HTML and the accessibility tree). Where canRunMetallic() allows,
 * the same text is rasterised and painted in liquid chrome by a canvas laid
 * over the H1; the H1's own paint is hidden only once that canvas has drawn,
 * and comes back on resize, context loss or any failure.
 */
export function MetallicHero({ lines, children }: MetallicHeroProps) {
  const hydrated = useHydrated();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [raster, setRaster] = useState<MetallicRaster | null>(null);
  const rasterRef = useRef<MetallicRaster | null>(null);
  // Whether the canvas has drawn the current raster (set by onReady).
  const drawnRef = useRef(false);
  const [painted, setPainted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const linesKey = lines.join('\n');

  // Rasterise after hydration and idle; again (debounced) when the H1's box changes.
  useEffect(() => {
    const h1 = wrapRef.current?.querySelector('h1');
    if (!hydrated || failed || !h1) return;
    let cancelled = false;
    let runId = 0;
    let cancelIdle: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = (r: MetallicRaster | null) => {
      const prev = rasterRef.current;
      if (prev && r && prev.url === r.url && prev.width === r.width && prev.height === r.height) {
        // Same image in the same box: no new onReady will come, so reuse the last one.
        setPainted(drawnRef.current);
        return;
      }
      drawnRef.current = false;
      rasterRef.current = r;
      setRaster(r);
    };

    const run = () => {
      const id = ++runId;
      cancelIdle?.();
      cancelIdle = whenIdle(() => {
        if (cancelled || id !== runId) return;
        if (!canRunMetallic()) {
          apply(null);
          return;
        }
        // Only the newest run may apply its raster; a slower, older one is dropped.
        const settle = (r: MetallicRaster | null) => {
          if (!cancelled && id === runId) apply(r);
        };
        rasterFor(h1, linesKey.split('\n')).then(settle, () => settle(null));
      });
    };

    // The raster depends on the H1's box and on the 768px gate; nothing else (height-only
    // window resizes, RO's first callback) should hide the canvas.
    const sizeKey = () =>
      `${window.innerWidth >= METALLIC_MIN_WIDTH}:${h1.offsetWidth}x${h1.offsetHeight}`;
    let lastKey = sizeKey();
    const onResize = () => {
      const key = sizeKey();
      if (key === lastKey) return;
      lastKey = key;
      // Show the typeset text while the canvas is stale; onReady swaps back.
      setPainted(false);
      runId++;
      cancelIdle?.();
      clearTimeout(timer);
      timer = setTimeout(run, RESIZE_DEBOUNCE_MS);
    };

    run();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    ro?.observe(h1);
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      cancelIdle?.();
      clearTimeout(timer);
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [hydrated, failed, linesKey]);

  // Follow the theme toggle (a class on <html>).
  useEffect(() => {
    if (!hydrated) return;
    setIsLight(readIsLight());
    if (typeof MutationObserver !== 'function') return;
    const mo = new MutationObserver(() => setIsLight(readIsLight()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, [hydrated]);

  const handleReady = useCallback(() => {
    drawnRef.current = true;
    setPainted(true);
  }, []);
  const handleError = useCallback(() => {
    setPainted(false);
    setFailed(true);
    drawnRef.current = false;
    rasterRef.current = null;
    setRaster(null);
  }, []);

  const live = painted && raster !== null && !failed;

  return (
    <div ref={wrapRef} className="relative">
      <ChromeText as="h1" className={`display-1${live ? ' bg-none text-transparent' : ''}`}>
        {children}
      </ChromeText>
      {raster && !failed ? (
        <div
          aria-hidden="true"
          className="metallic-overlay pointer-events-none absolute"
          style={{
            left: -raster.padding,
            top: -raster.padding,
            width: raster.width,
            height: raster.height,
            opacity: live ? 1 : 0,
          }}
        >
          <Suspense fallback={null}>
            <MetallicPaint
              imageSrc={raster.url}
              fit="fill"
              lightColor={isLight ? PAINT.lightColorOnLight : PAINT.lightColorOnDark}
              darkColor={isLight ? PAINT.darkColorOnLight : PAINT.darkColorOnDark}
              tintColor={PAINT.tintColor}
              speed={PAINT.speed}
              liquid={PAINT.liquid}
              refraction={PAINT.refraction}
              contrast={PAINT.contrast}
              brightness={PAINT.brightness}
              onReady={handleReady}
              onError={handleError}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
