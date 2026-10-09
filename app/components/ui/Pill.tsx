import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  tone?: 'line' | 'accent';
  className?: string;
}

/** Mono chip. `accent` is a signal (badges), never decoration. */
export function Pill({ children, tone = 'line', className = '' }: PillProps) {
  const toneClass = tone === 'accent' ? 'border-accent/50 text-accent' : '';
  return <span className={`pill ${toneClass} ${className}`.trim()}>{children}</span>;
}
