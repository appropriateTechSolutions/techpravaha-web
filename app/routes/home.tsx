import { Link } from 'react-router';
import { ArrowUpRight } from '@phosphor-icons/react';
import type { Route } from './+types/home';
import { ATS_URL, pageMeta } from '../lib/site';
import { catalogue } from '../lib/catalogue';
import { WORK } from '../content/work';
import { LAB } from '../content/lab';
import { TESTIMONIALS } from '../content/testimonials';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Pill } from '../components/ui/Pill';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { MetallicHero } from '../components/MetallicHero';
import { LabCard } from '../components/LabCard';
import { ServiceCard } from '../components/ServiceCard';
import { ClosingCta } from '../components/ClosingCta';
import { Steps } from '../components/Steps';
import { Testimonials } from '../components/Testimonials';
import { WorkCard } from '../components/WorkCard';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Tech Pravaha | Beautiful things, shipped.',
    description:
      'A design and build studio for things you launch: websites, apps, AI front doors and WhatsApp automation. Delivered in weeks at a price you can see.',
    path: '/',
  });
}

const SERVICES = [...catalogue.services].sort((a, b) => a.order - b.order);
const FEATURED = WORK.filter((w) => w.featured).slice(0, 3);
const LAB_TEASER = LAB.filter((l) => l.kind === 'play').slice(0, 3);

const STEPS = [
  { n: '01', title: 'Discover', body: 'A short call to agree the goal, the scope and the date.' },
  { n: '02', title: 'Design', body: 'Screens in the open, with your comments on every round.' },
  { n: '03', title: 'Build', body: 'Weekly builds you can click, set up on your own accounts.' },
  { n: '04', title: 'Launch', body: 'Live on your domain, with a walkthrough of everything we hand over.' },
];

const GRID = 'grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3';

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-36 pb-16 md:pt-48 md:pb-24">
        <div className="max-w-[980px]">
          <Eyebrow dot className="mb-8">
            Design &amp; build studio · India
          </Eyebrow>
          <MetallicHero lines={['Beautiful things,', 'shipped.']}>
            Beautiful things,
            <br />
            shipped.
          </MetallicHero>
          <p className="mt-8 max-w-[56ch] text-[19px] leading-relaxed text-ink-2">
            Websites, apps, AI call centres and WhatsApp automation. Designed properly, live in weeks,
            priced upfront. Pick a package or ask for bespoke.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/pricing" size="lg">
              See packages
            </Button>
            <Button to="/work" variant="secondary" size="lg">
              See the work
              <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
            </Button>
          </div>
          <ul aria-label="Services" className="mt-12 flex flex-wrap gap-x-2 md:mt-16">
            {SERVICES.map((s) => (
              <li key={s.id}>
                <Link to={s.route} className="group inline-flex min-h-11 items-center rounded-full">
                  <Pill className="transition-colors duration-150 group-hover:border-ink group-hover:text-ink">
                    {s.name}
                  </Pill>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6">
        <ul className="grid divide-y divide-line border-y border-line leading-relaxed text-balance md:grid-cols-3 md:divide-x md:divide-y-0">
          <li className="label-mono py-5 md:px-6 md:first:pl-0">Fixed scope · fixed price · kickoff date on the invoice</li>
          <li className="label-mono py-5 md:px-6">Pay by UPI, card or netbanking · GST invoice</li>
          <li className="label-mono py-5 md:px-6 md:last:pr-0">
            By the studio behind{' '}
            <a
              href={ATS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
            >
              Appropriate Tech Solutions
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>

      <Section
        eyebrow="Services"
        title="Six things we build."
        intro="Each one comes as a fixed package with the price on the page, or as a bespoke quote."
      >
        <div className={GRID}>
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={i * 60}>
              <ServiceCard service={s} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Work"
        title="Recent work."
        intro="Two shipped client apps and one product still in build, all named with permission."
      >
        <div className={GRID}>
          {FEATURED.map((w, i) => (
            <Reveal key={w.slug} delay={i * 60}>
              <WorkCard item={w} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Lab"
        title="Small, finished things."
        intro="Browser toys built to test an idea, small, finished and free to play."
      >
        <div className={GRID}>
          {LAB_TEASER.map((l, i) => (
            <Reveal key={l.slug} delay={i * 60}>
              <LabCard item={l} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <Button to="/lab" variant="secondary">
            Play all
            <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      </Section>

      <Section
        eyebrow="Process"
        title="How it works."
        intro="The same four steps, whether it is a landing page or an app."
      >
        <Steps steps={STEPS} />
      </Section>

      <Testimonials items={TESTIMONIALS} />

      <ClosingCta
        title="Tell us what you want to launch."
        intro="One call to agree the scope, the price and a start date."
        message="Hi Tech Pravaha, I want to talk about a project."
        page="/"
      />
    </>
  );
}
