import type { Route } from './+types/work';
import { ATS_URL, pageMeta } from '../lib/site';
import { WORK } from '../content/work';
import { Section } from '../components/ui/Section';
import { WorkCard } from '../components/WorkCard';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Work',
    description: 'Websites, apps and products launched by Tech Pravaha, for clients and for ourselves.',
    path: '/work',
    image: '/og/work.png',
  });
}

export default function WorkIndex() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-8 md:pt-40 md:pb-12">
        <h1 className="display-1 text-[clamp(2.75rem,6.4vw,6rem)]">Work</h1>
        <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
          Launched for clients, and a few things we built because we wanted them to exist.
        </p>
      </section>

      <Section className="!pt-8 md:!pt-12">
        <h2 className="sr-only">Launched work</h2>
        {/* First row sits above the fold, so the grid renders in place (no Reveal). */}
        <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {WORK.map((w) => (
            <WorkCard key={w.slug} item={w} />
          ))}
        </div>
        <p className="mt-16 max-w-[60ch] text-ink-2">
          Operational systems, data platforms and the deep engineering work live at{' '}
          <a
            href={ATS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
          >
            Appropriate Tech Solutions
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </Section>
    </>
  );
}
