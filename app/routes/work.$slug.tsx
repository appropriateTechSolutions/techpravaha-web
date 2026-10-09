import { data, Link, useParams } from 'react-router';
import type { Route } from './+types/work.$slug';
import { pageMeta } from '../lib/site';
import { getService } from '../lib/catalogue';
import { STATUS_LABEL, WORK } from '../content/work';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Pill } from '../components/ui/Pill';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { Breadcrumb } from '../components/Breadcrumb';
import { ClosingCta } from '../components/ClosingCta';

const META_MAX = 155;

function findWork(slug: string | undefined) {
  return WORK.find((w) => w.slug === slug);
}

/** Truncate at a word boundary so a long one-liner still fits a meta description. */
function clip(text: string, max = META_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s.,;:]+$/, '')}…`;
}

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  const item = findWork(params.slug);
  if (!item) return [{ title: 'Page not found | Tech Pravaha' }];
  return pageMeta({
    title: `${item.name} · Work`,
    description: clip(item.oneLiner),
    path: `/work/${item.slug}`,
  });
}

export default function WorkPage() {
  const { slug } = useParams();
  const item = findWork(slug);
  if (!item) throw data(null, { status: 404 });

  const related = item.services.map((id) => ({ id, service: getService(id) }));

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <Breadcrumb
          items={[
            { name: 'Work', path: '/work' },
            { name: item.name, path: `/work/${item.slug}` },
          ]}
        />

        <div className="max-w-[1040px]">
          <Eyebrow dot className="mb-6">
            {item.client ?? 'Studio product'} · {STATUS_LABEL[item.status]}
          </Eyebrow>
          <h1 className="display-1 text-[clamp(2.5rem,5.6vw,5rem)]">{item.name}</h1>
          <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">{item.oneLiner}</p>
        </div>
      </section>

      <Section eyebrow="Context" title="The problem.">
        <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">{item.problem}</p>
      </Section>

      <Section eyebrow="Delivered" title="What shipped.">
        <ul className="grid max-w-[900px] gap-3">
          {item.shipped.map((s) => (
            <li key={s} className="flex gap-3 text-[17px] leading-relaxed text-ink-2">
              <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Build">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="label-mono mb-4">Stack</h2>
            <ul className="flex flex-wrap gap-2">
              {item.stack.map((s) => (
                <li key={s}>
                  <Pill>{s}</Pill>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="label-mono mb-4">Timeline</h2>
            <p className="label-mono text-ink-2">{item.timeline}</p>
          </div>
        </div>
      </Section>

      {item.images.length > 0 && (
        <Section eyebrow="Screens">
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
            {item.images.map((src, i) => (
              <Reveal key={src} delay={i * 60}>
                <div className="card overflow-hidden">
                  <img
                    src={src}
                    alt={`${item.name} screen ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section eyebrow="Related services">
          <ul className="flex flex-wrap gap-3">
            {related.map(({ id, service }) => (
              <li key={id}>
                {service ? (
                  <Link
                    to={service.route}
                    className="pill transition-colors hover:border-ink hover:text-ink"
                  >
                    {service.name}
                  </Link>
                ) : (
                  <Pill>{id}</Pill>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ClosingCta
        title="Want something like this?"
        message={`Hi Tech Pravaha, I saw ${item.name} and want to talk about a project.`}
        page={`/work/${item.slug}`}
      />
    </>
  );
}
