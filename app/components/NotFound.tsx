import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Eyebrow } from './ui/Eyebrow';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/work', label: 'Work' },
  { to: '/contact', label: 'Contact' },
];

/** The 404 page body. Rendered by the catch-all route (app/routes/catchall.tsx). */
export function NotFound() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-36 pb-24 md:pt-48 md:pb-32">
      <div className="max-w-[880px]">
        <Eyebrow dot className="mb-8">
          404
        </Eyebrow>
        <h1 className="display-2">That page did not ship.</h1>
        <p className="mt-8 max-w-[56ch] text-[19px] leading-relaxed text-ink-2">
          The link may be old or mistyped. These pages are live:
        </p>
        <ul className="mt-10 flex flex-wrap gap-3">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-5 font-semibold text-ink transition-colors hover:border-ink"
              >
                {l.label}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
