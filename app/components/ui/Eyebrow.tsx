import type { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

/** Mono label above a heading, with an optional accent dot. */
export function Eyebrow({ children, dot = false, className = '' }: EyebrowProps) {
  return (
    <p className={`label-mono inline-flex items-center gap-2.5 ${className}`.trim()}>
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />}
      {children}
    </p>
  );
}
