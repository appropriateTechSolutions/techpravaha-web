import { useEffect, useRef, useState } from 'react';
import { cubicBezier, useInView, useReducedMotion } from 'motion/react';
import { EASE_OUT_EXPO } from '../../lib/motion';

interface CounterProps {
  to: number;
  suffix?: string;
  /** Seconds. Stays within the 600ms motion budget by default. */
  duration?: number;
  className?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const ease = cubicBezier(...EASE_OUT_EXPO);

/**
 * Counts up from 0 the first time it scrolls into view. The prerendered HTML,
 * reduced-motion visitors and counters already on screen at hydration show the
 * final value with no animation (no final, 0, final flash).
 *
 * Width is reserved for the final value (`.counter` in theme.css) and digits
 * are tabular, so counting never shifts layout.
 */
export function Counter({ to, suffix = '', duration = 0.6, className = '' }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() === true;
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(to);
  const [armed, setArmed] = useState(false);
  const final = `${fmt(to)}${suffix}`;

  // After hydration, park at 0 only if the number is still off screen.
  useEffect(() => {
    const el = ref.current;
    if (reduce || !el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) return;
    setValue(0);
    setArmed(true);
  }, [reduce]);

  useEffect(() => {
    if (!armed || !inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setValue(to * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, inView, to, duration]);

  return (
    <span ref={ref} data-final={final} className={`counter ${className}`.trim()}>
      {fmt(value)}
      {suffix}
    </span>
  );
}
