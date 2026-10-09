import type { ReactNode } from 'react';
import type { Route } from './+types/styleguide';
import { pageMeta } from '../lib/site';
import { getService, getTier } from '../lib/catalogue';
import { Button } from '../components/ui/Button';
import { Counter } from '../components/ui/Counter';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Faq } from '../components/ui/Faq';
import { Pill } from '../components/ui/Pill';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { ChromeText } from '../components/ChromeText';
import { LabCard } from '../components/LabCard';
import { ServiceCard } from '../components/ServiceCard';
import { Steps } from '../components/Steps';
import { TierCard } from '../components/TierCard';
import { WhatsAppCta } from '../components/WhatsAppCta';
import { WorkCard } from '../components/WorkCard';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Styleguide',
    description: 'Tokens, type and components of the Tech Pravaha site, for visual QA in both themes.',
    path: '/styleguide',
    noindex: true,
  });
}

// Literal class names so Tailwind generates them; colour lives only in theme.css.
const SWATCHES = [
  { name: 'ground', className: 'bg-ground', use: 'Page background' },
  { name: 'surface', className: 'bg-surface', use: 'Cards' },
  { name: 'line', className: 'bg-line', use: 'Borders' },
  { name: 'line-strong', className: 'bg-line-strong', use: 'Strong borders' },
  { name: 'ink', className: 'bg-ink', use: 'Headings, primary fill' },
  { name: 'ink-2', className: 'bg-ink-2', use: 'Body text' },
  { name: 'muted', className: 'bg-muted', use: 'Labels' },
  { name: 'muted-2', className: 'bg-muted-2', use: 'Hints, footers' },
  { name: 'accent', className: 'bg-accent', use: 'Signals only' },
];

const BODY_SIZES = [
  { px: 19, className: 'text-[19px]' },
  { px: 16, className: 'text-base' },
  { px: 15, className: 'text-[15px]' },
  { px: 14, className: 'text-sm' },
  { px: 13, className: 'text-[13px]' },
];

const STEPS = [
  { n: '01', title: 'Discover', body: 'A short call to agree the goal, the scope and the date.' },
  { n: '02', title: 'Design', body: 'Screens in the open, with your comments on every round.' },
  { n: '03', title: 'Build', body: 'Weekly builds you can click, on your own accounts.' },
  { n: '04', title: 'Launch', body: 'Live on your domain, with a handover walkthrough.' },
];

const FAQ = [
  { q: 'Are prices inclusive of GST?', a: 'No. Every price is ex-GST, and 18% GST is added on the invoice.' },
  { q: 'Who owns the code and accounts?', a: 'You do. Everything is set up on your accounts from day one.' },
];

const WORK_SAMPLE = {
  slug: 'sample-project',
  name: 'Sample project',
  client: 'Sample client',
  status: 'live' as const,
  oneLiner: 'Placeholder entry for layout checks. Real work arrives with the content data.',
  services: ['Apps', 'Design'],
  images: [],
};

const LAB_SAMPLES = [
  {
    slug: 'sample-play',
    name: 'Sample toy',
    blurb: 'A single-file browser toy. Open it, play for a minute, close it.',
    kind: 'play' as const,
    href: '/',
    tags: ['Canvas', 'No sign-in'],
  },
  {
    slug: 'sample-extension',
    name: 'Sample extension',
    blurb: 'A Chrome extension without a store listing yet.',
    kind: 'extension' as const,
    href: '#',
    tags: ['Chrome'],
  },
];

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-8">
      <h2 className="label-mono mb-8">{label}</h2>
      {children}
    </div>
  );
}

export default function Styleguide() {
  const buy = getTier('websites-launch')!;
  const quote = getTier('apps-growth')!;
  const growth = getTier('websites-growth')!;
  const websites = getService('websites')!;

  return (
    <div className="pt-16">
      <Section>
        <header className="mb-16 max-w-3xl">
          <Eyebrow dot className="mb-5">
            Internal · noindex
          </Eyebrow>
          <h1 className="display-2">Styleguide</h1>
          <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
            Tokens, type and components in one place. Check every block in both themes with the
            toggle in the header.
          </p>
        </header>
        <div className="flex flex-col gap-20">
          <Group label="Colour tokens">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SWATCHES.map((s) => (
                <li key={s.name}>
                  <div className={`h-20 rounded-xl border border-line-strong ${s.className}`} />
                  <p className="mt-3 font-mono text-[13px] text-ink">--{s.name}</p>
                  <p className="text-[13px] text-muted">{s.use}</p>
                </li>
              ))}
              <li>
                <div className="flex h-20 items-center rounded-xl border border-line-strong px-4">
                  <ChromeText className="font-display text-3xl font-semibold tracking-[-0.03em]">
                    Chrome
                  </ChromeText>
                </div>
                <p className="mt-3 font-mono text-[13px] text-ink">--chrome</p>
                <p className="text-[13px] text-muted">Tagline text</p>
              </li>
            </ul>
          </Group>

          <Group label="Type scale">
            <div className="flex flex-col gap-10">
              <p className="display-1">Beautiful things, shipped.</p>
              <p className="display-2">An app your customers open.</p>
              <p className="display-3">Websites and landing pages</p>
              <div className="flex flex-col gap-3">
                {BODY_SIZES.map((b) => (
                  <p key={b.px} className={`${b.className} text-ink-2`}>
                    <span className="label-mono mr-4 inline-block w-12">{b.px}</span>
                    Fixed scope, fixed price, live in weeks.
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-8">
                <span className="label-mono">Label mono</span>
                <span className="label-mono is-accent">Label accent</span>
                <Eyebrow dot>Design and build studio · India</Eyebrow>
              </div>
            </div>
          </Group>

          <Group label="Chrome text">
            <ChromeText as="span" className="display-1 block">
              Beautiful things, shipped.
            </ChromeText>
          </Group>

          <Group label="Buttons">
            <div className="flex flex-col gap-6">
              {(['md', 'lg'] as const).map((size) => (
                <div key={size} className="flex flex-wrap items-center gap-4">
                  <span className="label-mono w-10">{size}</span>
                  <Button to="/styleguide" size={size}>
                    See packages
                  </Button>
                  <Button to="/styleguide" variant="secondary" size={size}>
                    See the work
                  </Button>
                  <Button to="/styleguide" variant="ghost" size={size}>
                    Read the FAQ
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4">
                <span className="label-mono w-10">cta</span>
                <WhatsAppCta message="Hi Tech Pravaha, this is a styleguide test." page="/styleguide" />
              </div>
            </div>
          </Group>

          <Group label="Pills">
            <div className="flex flex-wrap items-center gap-3">
              <Pill>Websites</Pill>
              <Pill>Apps</Pill>
              <Pill>WhatsApp</Pill>
              <Pill tone="accent">Recommended</Pill>
            </div>
          </Group>

          <Group label="Tier cards · buy, badge, quote">
            <div className="grid gap-6 pt-3 md:grid-cols-2 lg:grid-cols-3">
              <TierCard service={buy.service} tier={buy.tier} cta="whatsapp" />
              <TierCard service={growth.service} tier={growth.tier} cta="whatsapp" />
              <TierCard service={quote.service} tier={quote.tier} cta="whatsapp" />
            </div>
          </Group>

          <Group label="Service, work and lab cards">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <ServiceCard service={websites} />
              <WorkCard item={WORK_SAMPLE} />
              <div className="grid gap-6">
                {LAB_SAMPLES.map((item) => (
                  <LabCard key={item.slug} item={item} />
                ))}
              </div>
            </div>
          </Group>

          <Group label="Steps">
            <Steps steps={STEPS} />
          </Group>

          <Group label="Counter">
            <div className="flex flex-wrap gap-12">
              {[
                { to: 4, suffix: ' weeks', label: 'Counter, suffix' },
                { to: 250000, suffix: '', label: 'Counter, en-IN grouping' },
              ].map((c) => (
                <div key={c.label}>
                  <p className="font-display text-5xl font-semibold tracking-[-0.035em] text-ink">
                    <Counter to={c.to} suffix={c.suffix} />
                  </p>
                  <p className="label-mono mt-3">{c.label}</p>
                </div>
              ))}
            </div>
          </Group>

          <Group label="Reveal · staggered 60ms">
            <div className="grid gap-4 sm:grid-cols-3">
              {['One', 'Two', 'Three'].map((label, i) => (
                <Reveal key={label} delay={i * 60} className="card p-6">
                  <p className="text-ink">{label}</p>
                </Reveal>
              ))}
            </div>
          </Group>

          <Group label="FAQ">
            <div className="max-w-3xl">
              <Faq items={FAQ} />
            </div>
          </Group>
        </div>
      </Section>
    </div>
  );
}
