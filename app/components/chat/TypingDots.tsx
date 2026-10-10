import { m } from 'motion/react';

/** Three dots on a 600ms cycle; static under reduced motion. Announced once via sr-only text. */
export function TypingDots({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-6 items-center gap-1">
      <span className="sr-only">The assistant is typing</span>
      {[0, 1, 2].map((i) => (
        <m.span
          key={i}
          aria-hidden="true"
          className="size-1.5 rounded-full bg-muted"
          initial={false}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
