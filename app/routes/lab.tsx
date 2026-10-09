import { useState } from 'react';
import type { Route } from './+types/lab';
import { pageMeta } from '../lib/site';
import { LAB, type LabItem } from '../content/lab';
import { Section } from '../components/ui/Section';
import { LabCard } from '../components/LabCard';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Lab',
    description: 'Free micro-apps you can play in the browser, plus extensions and apps we have built.',
    path: '/lab',
    image: '/og/lab.png',
  });
}

type Filter = 'all' | LabItem['kind'];

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'play', label: 'Play' },
  { id: 'extension', label: 'Extensions' },
  { id: 'pwa', label: 'Apps' },
];

export default function LabPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const items = filter === 'all' ? LAB : LAB.filter((l) => l.kind === filter);
  const hasUnlinked = LAB.some((l) => l.href === '#');

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-8 md:pt-40 md:pb-12">
        <h1 className="display-1 text-[clamp(2.75rem,6.4vw,6rem)]">Lab</h1>
        <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
          Small, finished things. Open one, play for a minute, close it when it&rsquo;s your turn.
        </p>
      </section>

      <Section className="!pt-8 md:!pt-12">
        <h2 className="sr-only">Experiments</h2>
        <div role="group" aria-label="Filter by kind" className="mb-10 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const pressed = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => setFilter(f.id)}
                className={`pill min-h-9 cursor-pointer transition-colors hover:border-ink hover:text-ink ${
                  pressed ? 'border-ink text-ink' : ''
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* First rows sit above the fold, so the grid renders in place (no Reveal). */}
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {items.map((item) => (
            <LabCard key={item.slug} item={item} />
          ))}
        </div>

        {hasUnlinked && (
          <p className="label-mono mt-10 leading-relaxed">
            Extensions and installable apps are listed for reference; links are added as they are
            published.
          </p>
        )}
      </Section>
    </>
  );
}
