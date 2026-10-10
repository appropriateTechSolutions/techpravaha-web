import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';

/** Bottom padding for the Section right above a TeardownNote, in place of its usual py-20 md:py-28. */
export const TEARDOWN_NOTE_ABOVE = 'pb-12 md:pb-16';

/**
 * One-line pointer to the free teardown, for visitors who are not ready to buy. It carries no vertical
 * spacing of its own: the section before it shrinks its bottom padding (TEARDOWN_NOTE_ABOVE) and the
 * caller adds any space below through `className`.
 */
export function TeardownNote({ className = '' }: { className?: string }) {
  return (
    <section className={`mx-auto max-w-[1280px] px-6 ${className}`.trim()}>
      <p className="text-ink-2">
        Not ready to buy?{' '}
        <Link
          to="/teardown"
          className="inline-flex min-h-11 items-center gap-1.5 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Get a free 10-point teardown of your current site.
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
