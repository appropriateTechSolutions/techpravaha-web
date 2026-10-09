import { render } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '../app/components/ui/Reveal';
import { Counter } from '../app/components/ui/Counter';
import { Steps } from '../app/components/Steps';

// The visitor's motion preference, as `useReducedMotion()` from motion/react reports it.
let reduce = true;
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reduce };
});

// jsdom has no IntersectionObserver; nothing ever reports as seen.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  reduce = true;
  vi.stubGlobal('IntersectionObserver', IO);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// The app's provider (root.tsx), so `m.*` behaves as it does on the site.
const wrap = (ui: ReactNode) =>
  render(
    <LazyMotion features={domAnimation} strict>
      {ui}
    </LazyMotion>,
  );

const STEPS = [
  { n: '01', title: 'Pick', body: 'Choose a package.' },
  { n: '02', title: 'Pay', body: 'Pay the first half.' },
];

describe('reduced motion', () => {
  it('Reveal renders its children in place, with no inline opacity or transform', () => {
    const { container, getByText } = wrap(
      <Reveal delay={120}>
        <p>Visible at once</p>
      </Reveal>,
    );
    const el = container.querySelector<HTMLElement>('[data-reveal]')!;
    expect(getByText('Visible at once')).toBeInTheDocument();
    expect(el.style.opacity).toBe('');
    expect(el.style.transform).toBe('');
  });

  it('Reveal still hides until seen when motion is welcome (control)', () => {
    reduce = false;
    const { container } = wrap(
      <Reveal>
        <p>Rises in</p>
      </Reveal>,
    );
    const el = container.querySelector<HTMLElement>('[data-reveal]')!;
    expect(el.style.opacity).toBe('0');
    expect(el.style.transform).not.toBe('');
  });

  it('Counter shows the final value immediately, even off screen', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 5000,
      bottom: 5040,
      left: 0,
      right: 200,
      width: 200,
      height: 40,
      x: 0,
      y: 5000,
      toJSON: () => ({}),
    } as DOMRect);
    const { container } = wrap(<Counter to={250000} suffix="+" />);
    expect(container.querySelector('.counter')).toHaveTextContent('2,50,000+');
  });

  it('Steps draws the tracing line in full, with no scale animation pending', () => {
    const { container, getAllByRole } = wrap(<Steps steps={STEPS} />);
    const line = container.querySelector<HTMLElement>('[data-reveal]')!;
    expect(line.style.transform).toBe('');
    expect(getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });

  it('Steps parks the line at scaleX(0) when motion is welcome (control)', () => {
    reduce = false;
    const { container } = wrap(<Steps steps={STEPS} />);
    const line = container.querySelector<HTMLElement>('[data-reveal]')!;
    expect(line.style.transform).toMatch(/scaleX\(0\)/);
  });
});
