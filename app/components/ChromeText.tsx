import type { ReactNode } from 'react';

interface ChromeTextProps {
  as?: 'h1' | 'span';
  children: ReactNode;
  className?: string;
}

/** Liquid-chrome gradient text with a slow sheen (static under reduced motion). */
export function ChromeText({ as: Tag = 'span', children, className = '' }: ChromeTextProps) {
  return <Tag className={`chrome-text chrome-sheen ${className}`.trim()}>{children}</Tag>;
}
