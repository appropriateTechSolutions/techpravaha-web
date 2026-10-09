import { ArrowUpRight } from '@phosphor-icons/react';
import { Link } from 'react-router';
import type { Route } from './+types/pricing';
import { pageMeta } from '../lib/site';
import { catalogue, formatINR } from '../lib/catalogue';
import { SERVICES as CONTENT } from '../content/services';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Faq } from '../components/ui/Faq';
import { Pill } from '../components/ui/Pill';
import { Section } from '../components/ui/Section';
import { TierCard } from '../components/TierCard';
import { WhatsAppCta } from '../components/WhatsAppCta';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Pricing',
    description:
      'Prices in INR for websites, apps, AI assistants, WhatsApp automation, content automation and UI/UX design for businesses in India. Fixed scope, GST extra.',
    path: '/pricing',
    image: '/og/pricing.png',
  });
}

const SERVICES = [...catalogue.services].sort((a, b) => a.order - b.order);
const GST_PCT = `${Math.round(catalogue.gst * 100)}%`;

const FAQ = [
  {
    q: 'How is payment split?',
    a: 'Each package card shows its terms. Fixed-price packages are paid either in full at checkout, or 50% at checkout and 50% at launch. Quoted packages and bespoke work get a fixed price and payment schedule in writing after a call, before any work starts.',
  },
  {
    q: 'Is GST included in the price?',
    a: `No. Prices are shown before tax, and ${GST_PCT} GST is added on top. You get a GST invoice, so a registered business can claim input tax credit.`,
  },
  {
    q: 'Can I get a refund?',
    a: 'Refunds follow our refund policy, which sets out what is refunded and when. It is on the Refunds page, linked below and in the footer of every page.',
  },
  {
    q: 'What does bespoke mean?',
    a: 'Work that does not fit a fixed package. We scope it on a call, then agree a fixed price and payment schedule in writing before we start. The "from" figure is where bespoke work starts.',
  },
];

export default function Pricing() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="max-w-3xl">
          <Eyebrow dot className="mb-6">
            Pricing
          </Eyebrow>
          <h1 className="display-1">Every package, one page.</h1>
          <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
            Fixed scope and a fixed price for each package, or a bespoke quote. Prices in INR, before{' '}
            {GST_PCT} GST.
          </p>
        </div>
      </section>

      <nav
        aria-label="Services on this page"
        className="z-40 border-y border-line bg-ground/90 backdrop-blur md:sticky md:top-16"
      >
        <ul className="mx-auto flex max-w-[1280px] flex-wrap gap-2 px-6 py-3">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="group inline-flex min-h-11 items-center rounded-full">
                <Pill className="transition-colors duration-150 group-hover:border-ink group-hover:text-ink">
                  {s.name}
                </Pill>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SERVICES.map((s) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-title`}
          className="mx-auto max-w-[1280px] scroll-mt-36 border-b border-line px-6 py-16 md:py-24"
        >
          <header className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="max-w-3xl">
              <h2 id={`${s.id}-title`} className="display-2">
                {s.name}
              </h2>
              <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-2">{CONTENT[s.id].subline}</p>
            </div>
            <Link
              to={s.route}
              className="label-mono inline-flex min-h-11 shrink-0 items-center gap-2 transition-colors hover:text-ink"
            >
              More on {s.name}
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </header>
          <div className="grid gap-6 lg:grid-cols-3">
            {s.tiers.map((t) => (
              <TierCard key={t.id} service={s} tier={t} cta="whatsapp" />
            ))}
          </div>
        </section>
      ))}

      <Section eyebrow="Add-on" title="After launch.">
        <div className="grid gap-6 lg:grid-cols-3">
          {catalogue.addons.map((a) => (
            <article key={a.id} id={a.id} className="card flex flex-col p-7 md:p-8">
              <h3 className="display-3">{a.name}</h3>
              <p className="mt-2 text-ink-2">{a.blurb}</p>
              <div className="mt-8 border-t border-line pt-6">
                <p className="font-display text-[2.5rem] leading-none font-semibold tracking-[-0.035em] text-ink tabular-nums">
                  From {formatINR(a.from)}
                </p>
                <p className="label-mono mt-3">
                  per {a.per} · +{GST_PCT} GST
                </p>
              </div>
              <div className="mt-auto pt-9">
                <WhatsAppCta
                  message={`Hi Tech Pravaha, I'd like to ask about the ${a.name} add-on.`}
                  label={`Ask about ${a.name}`}
                  page="/pricing"
                />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Questions about paying.">
        <Faq items={FAQ} />
        <p className="mt-8 text-ink-2">
          Read the{' '}
          <Link
            to="/refunds"
            className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
          >
            refund policy
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
