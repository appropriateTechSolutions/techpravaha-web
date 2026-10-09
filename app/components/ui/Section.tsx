import { useId, type ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';

interface SectionProps {
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Page section on the 1280px grid. Header (eyebrow, h2, intro) is optional. */
export function Section({ id, eyebrow, title, intro, children, className = '' }: SectionProps) {
  const titleId = useId();
  const hasHeader = eyebrow || title || intro;
  return (
    <section
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={`mx-auto max-w-[1280px] px-6 py-20 md:py-28 ${className}`.trim()}
    >
      {hasHeader && (
        <header className="mb-12 max-w-3xl md:mb-16">
          {eyebrow && <Eyebrow dot className="mb-5">{eyebrow}</Eyebrow>}
          {title && (
            <h2 id={titleId} className="display-2">
              {title}
            </h2>
          )}
          {intro && <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">{intro}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
