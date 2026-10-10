import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Counter } from '../app/components/ui/Counter';

// jsdom has no IntersectionObserver; this stub lets a test decide when the counter is seen.
let observed: ((entries: Partial<IntersectionObserverEntry>[]) => void)[] = [];
class IO {
  constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    observed.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function placeAt(top: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 40,
    left: 0,
    right: 200,
    width: 200,
    height: 40,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

// requestAnimationFrame and the clock are driven by hand, so the count-up never depends on real time
// (it used to flake under parallel load).
let frames: FrameRequestCallback[] = [];
let now = 0;
function advance(ms: number) {
  now += ms;
  const due = frames;
  frames = [];
  act(() => due.forEach((cb) => cb(now)));
}

beforeEach(() => {
  observed = [];
  frames = [];
  now = 1000;
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Counter', () => {
  it('shows the final value immediately when it is on screen at mount', () => {
    placeAt(100);
    const { container } = render(<Counter to={250000} suffix="+" />);
    const el = container.querySelector('.counter')!;
    expect(el).toHaveTextContent('2,50,000+');
    expect(el).toHaveAttribute('data-final', '2,50,000+');
    // Even once the observer reports it, it does not restart from 0.
    act(() => observed.forEach((cb) => cb([{ isIntersecting: true, target: el }])));
    expect(el).toHaveTextContent('2,50,000+');
  });

  it('parks at 0 off screen and counts to the final value once seen', () => {
    placeAt(5000);
    const { container } = render(<Counter to={1000} suffix=" leads" duration={0.6} />);
    const el = container.querySelector('.counter')!;
    expect(el).toHaveTextContent(/^0 leads$/);
    // Nothing runs until it is seen.
    advance(1000);
    expect(el).toHaveTextContent(/^0 leads$/);

    act(() => observed.forEach((cb) => cb([{ isIntersecting: true, target: el }])));
    advance(0);
    expect(el).toHaveTextContent(/^0 leads$/);
    advance(60);
    const mid = Number(el.textContent!.replace(/\D/g, ''));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1000);
    advance(540);
    expect(el).toHaveTextContent(/^1,000 leads$/);
    // Done: no frame is scheduled after the last one.
    expect(frames).toHaveLength(0);
  });
});
