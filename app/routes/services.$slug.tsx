import { data, useParams } from 'react-router';
import type { Route } from './+types/services.$slug';
import { pageMeta } from '../lib/site';
import { catalogue, getService } from '../lib/catalogue';
import { serviceSchema } from '../lib/schema';
import { SERVICES } from '../content/services';
import { WORK } from '../content/work';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Faq } from '../components/ui/Faq';
import { JsonLd } from '../components/ui/JsonLd';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { Breadcrumb } from '../components/Breadcrumb';
import { ClosingCta } from '../components/ClosingCta';
import { Steps } from '../components/Steps';
import { TierCard } from '../components/TierCard';
import { WorkCard } from '../components/WorkCard';

const GST = `${Math.round(catalogue.gst * 100)}% GST`;

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  const service = getService(params.slug);
  const content = SERVICES[params.slug];
  if (!service || !content) return [{ title: 'Page not found | Tech Pravaha' }];
  return pageMeta({
    title: content.metaTitle,
    description: content.metaDescription,
    path: service.route,
    image: `/og/services-${service.id}.png`,
  });
}

export default function ServicePage() {
  const { slug = '' } = useParams();
  const service = getService(slug);
  const content = Object.hasOwn(SERVICES, slug) ? SERVICES[slug] : undefined;
  if (!service || !content) throw data(null, { status: 404 });

  const related = content.related
    .map((s) => WORK.find((w) => w.slug === s))
    .filter((w) => w !== undefined);

  return (
    <>
      <JsonLd data={serviceSchema(service)} />

      <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-16 md:pt-40 md:pb-20">
        <Breadcrumb
          items={[
            { name: 'Services', path: '/services' },
            { name: service.name, path: service.route },
          ]}
        />

        <div className="max-w-[1040px]">
          <h1 className="display-1 text-[clamp(2.75rem,6.4vw,6rem)]">{content.h1}</h1>
          <p className="mt-8 max-w-[60ch] text-[19px] leading-relaxed text-ink-2">{content.subline}</p>
        </div>

        <dl className="mt-16 grid divide-y divide-line border-y border-line lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {content.facts.map((f) => (
            <div key={f.label} className="py-5 lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <dt className="label-mono">{f.label}</dt>
              <dd className="mt-2 text-[15px] leading-snug text-ink-2">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section
        id="packages"
        eyebrow="Packages"
        title="Pick a package."
        intro="Three ways in. Each one has a fixed scope and the price on the card."
        className="scroll-mt-16"
      >
        <div className="grid gap-6 lg:grid-cols-3 [&_article]:scroll-mt-24">
          {service.tiers.map((tier) => (
            <TierCard key={tier.id} service={service} tier={tier} />
          ))}
        </div>
        <p className="label-mono mt-8 leading-relaxed">
          Prices in INR, {GST} extra. Pay by UPI, card or netbanking.
        </p>
      </Section>

      <Section eyebrow="After you pay" title="What happens after you pay.">
        <Steps steps={content.afterPay} />
      </Section>

      <Section eyebrow="FAQ" title="Questions before you buy.">
        <Faq items={content.faq} />
      </Section>

      {related.length > 0 && (
        <Section eyebrow="Work" title="Related work.">
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {related.map((w, i) => (
              <Reveal key={w.slug} delay={i * 60}>
                <WorkCard item={w} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <ClosingCta
        title="Not sure which package fits?"
        intro="One call to agree the scope, the price and a start date."
        message={`Hi Tech Pravaha, I want to talk about ${service.name}.`}
        page={service.route}
      />
    </>
  );
}
