import { ArrowUpRight } from '@phosphor-icons/react';
import type { Route } from './+types/services';
import { pageMeta } from '../lib/site';
import { catalogue } from '../lib/catalogue';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { ServiceCard } from '../components/ServiceCard';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Services',
    description:
      'Six services for businesses in India: websites, apps, AI assistants, WhatsApp automation, content automation and UI/UX design. Fixed packages, prices in INR.',
    path: '/services',
  });
}

const SERVICES = [...catalogue.services].sort((a, b) => a.order - b.order);

export default function ServicesIndex() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-20 md:pt-40 md:pb-28">
      <header className="mb-12 max-w-3xl md:mb-16">
        <Eyebrow dot className="mb-6">
          Services
        </Eyebrow>
        <h1 className="display-1">Six things we build.</h1>
        <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">
          Each one comes as a fixed package with the price on the page, or as a bespoke quote.
        </p>
      </header>

      <h2 className="sr-only">The six services</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>

      <div className="mt-12">
        <Button to="/pricing" variant="secondary">
          Compare every package
          <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
