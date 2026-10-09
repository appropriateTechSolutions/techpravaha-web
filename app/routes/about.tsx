import { ArrowUpRight, CalendarCheck, Code, Handshake, PencilSimpleLine, Tag } from '@phosphor-icons/react';
import type { Route } from './+types/about';
import { ATS_URL, pageMeta } from '../lib/site';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { WhatsAppCta } from '../components/WhatsAppCta';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'About',
    description:
      'Tech Pravaha is a design and build studio founded by Yogesh Laddha, for websites, apps, AI front doors and automation that ship in weeks.',
    path: '/about',
    image: '/og/about.png',
  });
}

const PRINCIPLES = [
  {
    icon: Tag,
    title: 'Fixed scope and price',
    body: 'You see what is included and what it costs before we start.',
  },
  {
    icon: CalendarCheck,
    title: 'A fixed kickoff date',
    body: 'The kickoff date is fixed when you book, and the timeline starts there.',
  },
  {
    icon: PencilSimpleLine,
    title: 'Two revision rounds',
    body: 'Design comes back to you twice for changes, inside the agreed scope.',
  },
  {
    icon: Code,
    title: 'You own the code and accounts',
    body: 'The domain and accounts are in your name from day one; ownership of the work transfers on full payment.',
  },
  {
    icon: Handshake,
    title: 'The person you talk to builds it.',
    body: 'No account managers and no hand-offs between your first call and launch.',
  },
];

export default function About() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="max-w-[1040px]">
          <Eyebrow dot className="mb-8">
            About
          </Eyebrow>
          <h1 className="display-2">A studio for things you launch.</h1>
          <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
            Tech Pravaha is run by Yogesh Laddha. He founded Appropriate Tech Solutions, a systems
            engineering studio for operationally complex industries. Tech Pravaha is its sibling studio,
            for websites, apps, AI front doors and automation that ship in weeks. Yogesh designs and builds
            the work himself.
          </p>
        </div>
      </section>

      <Section eyebrow="How we work" title="What does not change.">
        <ul className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 60} className="card p-6 md:p-8">
              <Icon size={24} aria-hidden="true" className="mb-5 text-accent" />
              <h3 className="mb-2 font-display text-xl font-semibold text-ink">{title}</h3>
              <p className="text-ink-2">{body}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Two studios, one founder" title="Systems there. Launches here.">
        <div className="max-w-[60ch]">
          <p className="text-[19px] leading-relaxed text-ink-2">
            Operational systems live at Appropriate Tech Solutions. Things you launch live here.
          </p>
          <div className="mt-8">
            <Button href={ATS_URL} variant="secondary">
              Visit Appropriate Tech Solutions
              <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Section>

      <Section eyebrow="Start a project" title="Have something to launch?">
        <div className="flex flex-wrap gap-3">
          <Button to="/contact" size="lg">
            Start a project
          </Button>
          <WhatsAppCta message="Hi Tech Pravaha, I want to talk about a project." page="/about" size="lg" />
        </div>
      </Section>
    </>
  );
}
