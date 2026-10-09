import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { EASE_OUT_EXPO, useHydrated } from '../../lib/motion';

/** 0.4s rise + at most 200ms stagger (index 3 at 60ms) stays within 600ms. */
const MAX_DELAY_MS = 200;

type Tag = 'div' | 'section' | 'article' | 'li' | 'figure';

interface RevealProps {
  children: ReactNode;
  /** Delay in ms, e.g. `i * 60` to stagger a grid. Capped at 200ms. */
  delay?: number;
  as?: Tag;
  className?: string;
}

/**
 * Fades and rises 12px into place the first time it enters the viewport.
 * Under reduced motion the children render in place with no animation.
 *
 * Hydration renders the prerendered (hidden) state so markup matches; for
 * reduced-motion visitors theme.css keeps `[data-reveal]` visible meanwhile,
 * and the in-view update lands instantly (duration 0).
 */
export function Reveal({ children, delay = 0, as = 'div', className }: RevealProps) {
  const reduce = useReducedMotion() === true;
  const hydrated = useHydrated();
  const Comp = m[as];
  const wait = Math.min(Math.max(delay, 0), MAX_DELAY_MS) / 1000;
  return (
    <Comp
      data-reveal=""
      className={className}
      initial={reduce && hydrated ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT_EXPO, delay: wait }}
    >
      {children}
    </Comp>
  );
}
