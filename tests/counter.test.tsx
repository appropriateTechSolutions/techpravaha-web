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

beforeEach(() => {
  observed = [];
  vi.stubGlobal('IntersectionObserver', IO);
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

  it('parks at 0 off screen and counts to the final value once seen', async () => {
    placeAt(5000);
    const { container } = render(<Counter to={4} suffix=" weeks" duration={0.05} />);
    const el = container.querySelector('.counter')!;
    expect(el).toHaveTextContent('0 weeks');

    act(() => observed.forEach((cb) => cb([{ isIntersecting: true, target: el }])));
    await vi.waitFor(() => expect(el).toHaveTextContent('4 weeks'));
  });
});
