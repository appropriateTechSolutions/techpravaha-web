import { m, useReducedMotion } from 'motion/react';
import { EASE_OUT_EXPO, useHydrated } from '../lib/motion';

interface Step {
  n: string;
  title: string;
  body: string;
}

/**
 * Numbered process, four up on desktop. On md+ a hairline traces across the
 * top the first time the row enters view (static under reduced motion).
 */
export function Steps({ steps }: { steps: Step[] }) {
  const reduce = useReducedMotion() === true;
  const hydrated = useHydrated();
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 hidden h-px bg-line md:block">
        <m.div
          data-reveal=""
          className="h-px origin-left bg-ink-2"
          initial={reduce && hydrated ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '0px 0px -15% 0px' }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT_EXPO }}
        />
      </div>
      <ol className="grid gap-10 md:grid-cols-4 md:gap-6 lg:gap-8">
        {steps.map((step) => (
          <li key={step.n} className="border-t border-line pt-6 md:border-t-0 md:pt-8">
            <span className="label-mono is-accent">{step.n}</span>
            <h3 className="mt-4 font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
