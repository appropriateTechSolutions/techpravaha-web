import { data, useParams } from 'react-router';
import { Check } from '@phosphor-icons/react';
import type { Route } from './+types/checkout.$tierId';
import { catalogue, chargedNow, formatINR, getTier, withGst, type Service, type Tier } from '../lib/catalogue';
import { pageMeta } from '../lib/site';
import { Breadcrumb } from '../components/Breadcrumb';
import { CheckoutForm } from '../components/CheckoutForm';
import { Eyebrow } from '../components/ui/Eyebrow';

const GST_LABEL = `GST ${Math.round(catalogue.gst * 100)}%`;

/** The tier if it can be bought online, else undefined (unknown or quote-only). */
function buyable(tierId: string | undefined): { service: Service; tier: Tier & { price: number } } | undefined {
  const found = tierId ? getTier(tierId) : undefined;
  if (!found || !found.tier.buyable || found.tier.price === null) return undefined;
  return found as { service: Service; tier: Tier & { price: number } };
}

function timeline(tier: Tier): string | null {
  if (tier.weeks) return `${tier.weeks} ${tier.weeks === 1 ? 'week' : 'weeks'} from the kickoff call`;
  if (tier.days) return `${tier.days} ${tier.days === 1 ? 'day' : 'days'} from the kickoff call`;
  return null;
}

export function meta({ params }: Route.MetaArgs): Route.MetaDescriptors {
  const found = buyable(params.tierId);
  if (!found) return [{ title: 'Page not found | Tech Pravaha' }];
  const { service, tier } = found;
  return pageMeta({
    title: `Checkout: ${service.name} · ${tier.label}`,
    description: `Buy ${service.name} · ${tier.label} for ${formatINR(tier.price)} plus GST. Pay by UPI, card or netbanking through Razorpay.`,
    path: `/checkout/${tier.id}`,
    noindex: true,
  });
}

export default function CheckoutPage() {
  const { tierId } = useParams();
  const found = buyable(tierId);
  if (!found) throw data(null, { status: 404 });
  const { service, tier } = found;

  const total = withGst(tier.price);
  const gst = total - tier.price;
  const charged = chargedNow(tier);
  const depositPct = tier.depositPct ?? 100;
  const time = timeline(tier);

  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-24 md:pt-40 md:pb-28">
      <Breadcrumb
        items={[
          { name: 'Services', path: '/services' },
          { name: service.name, path: service.route },
          { name: 'Checkout', path: `/checkout/${tier.id}` },
        ]}
      />

      <div className="max-w-[880px]">
        <Eyebrow dot className="mb-6">
          Checkout
        </Eyebrow>
        <h1 className="display-2 text-[clamp(2.25rem,5vw,4rem)]">
          {service.name} · {tier.label}
        </h1>
        <p className="mt-6 max-w-[56ch] text-[19px] leading-relaxed text-ink-2">{tier.tagline}</p>
      </div>

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-16">
        <aside aria-labelledby="order-summary" className="card p-6 md:p-8 lg:sticky lg:top-28 lg:order-2">
          <h2 id="order-summary" className="label-mono">
            Order summary
          </h2>
          <p className="mt-4 text-ink">
            <span className="font-semibold">{service.name}</span>
            <span className="text-ink-2"> · {tier.label}</span>
          </p>
          {time && <p className="mt-1 text-sm text-muted">Timeline: {time}</p>}

          <ul className="mt-6 flex flex-col gap-3 text-[15px] leading-snug text-ink-2">
            {tier.includes.map((line) => (
              <li key={line} className="flex gap-3">
                <Check size={14} weight="bold" aria-hidden="true" className="mt-[3px] shrink-0 text-accent" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid gap-3 border-t border-line pt-6 text-[15px] tabular-nums">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Price (ex-GST)</dt>
              <dd className="text-ink">{formatINR(tier.price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{GST_LABEL}</dt>
              <dd className="text-ink">{formatINR(gst)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-display text-[1.75rem] leading-none font-semibold tracking-[-0.02em] text-ink">
                {formatINR(total)}
              </dd>
            </div>
          </dl>
          {depositPct < 100 ? (
            <>
              <p className="label-mono mt-5">
                Charged now: {formatINR(charged)} ({depositPct}% deposit)
              </p>
              <p className="label-mono mt-2">Balance at launch: {formatINR(total - charged)}</p>
            </>
          ) : (
            <p className="label-mono mt-5">Charged now: {formatINR(charged)}</p>
          )}
        </aside>

        <div className="lg:order-1">
          <h2 className="display-3 mb-2">Your details.</h2>
          <p className="mb-8 text-ink-2">Name, email and mobile. Company and GSTIN are optional.</p>
          <CheckoutForm service={service} tier={tier} />
        </div>
      </div>
    </section>
  );
}
