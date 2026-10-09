import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetallicHero } from '../app/components/MetallicHero';
import { canRunMetallic } from '../app/lib/metallic';
import { rasterText } from '../app/lib/rasterText';

function stubMatchMedia(reduced: boolean, forcedColors = false) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches:
          (reduced && query.includes('prefers-reduced-motion')) ||
          (forcedColors && query.includes('forced-colors')),
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** webgl2 succeeds (a minimal fake); every other context type (2d) is unavailable. */
function stubWebgl2(available: boolean) {
  const fakeGl = { getExtension: () => null };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((type: string) =>
    available && type === 'webgl2' ? fakeGl : null) as unknown as typeof HTMLCanvasElement.prototype.getContext);
}

function setWidth(px: number) {
  vi.stubGlobal('innerWidth', px);
}

/** Desktop, motion allowed, webgl2 present: the conditions under which the shader may run. */
function capable() {
  stubMatchMedia(false);
  stubWebgl2(true);
  setWidth(1440);
}

beforeEach(() => {
  capable();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('canRunMetallic', () => {
  it('is true with webgl2, motion allowed and a 1440px viewport', () => {
    expect(canRunMetallic()).toBe(true);
  });

  it('is false when the canvas has no webgl2 context', () => {
    stubWebgl2(false);
    expect(canRunMetallic()).toBe(false);
  });

  it('is false when the user prefers reduced motion', () => {
    stubMatchMedia(true);
    expect(canRunMetallic()).toBe(false);
  });

  it('is false when forced colours are active', () => {
    stubMatchMedia(false, true);
    expect(canRunMetallic()).toBe(false);
  });

  it('is false on a 375px viewport', () => {
    setWidth(375);
    expect(canRunMetallic()).toBe(false);
  });

  it('is false on a low-memory device', () => {
    vi.stubGlobal('navigator', { ...navigator, deviceMemory: 2 });
    expect(canRunMetallic()).toBe(false);
  });
});

describe('MetallicHero', () => {
  const conditions: Array<[string, () => void]> = [
    ['capable desktop', () => {}],
    ['no webgl2', () => stubWebgl2(false)],
    ['reduced motion', () => stubMatchMedia(true)],
    ['narrow viewport', () => setWidth(375)],
  ];

  it.each(conditions)('keeps the tagline as a real H1 (%s)', async (_label, setup) => {
    setup();
    vi.useFakeTimers();
    render(
      <MetallicHero lines={['Beautiful things,', 'shipped.']}>
        Beautiful things,
        <br />
        shipped.
      </MetallicHero>,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Beautiful things,shipped.');

    // Let the idle callback and any raster attempt run; the H1 must survive all of it.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Beautiful things,shipped.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('rasterText', () => {
  it('returns null when no canvas context is available', async () => {
    stubWebgl2(false);
    vi.stubGlobal('OffscreenCanvas', undefined);
    const url = await rasterText({
      text: 'Beautiful things,\nshipped.',
      font: '600 120px sans-serif',
      lineHeight: 110,
      maxWidth: 980,
    });
    expect(url).toBeNull();
  });
});
