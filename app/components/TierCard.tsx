import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { ArrowUpRight, Check, WhatsappLogo } from '@phosphor-icons/react';
import { catalogue, formatINR, type Service, type Tier } from '../lib/catalogue';
import { track } from '../lib/analytics';
import { pagePath } from '../lib/site';
import { tierMessage, waLink } from '../lib/whatsapp';
import { Button } from './ui/Button';
import { Pill } from './ui/Pill';

interface TierCardProps {
  service: Service;
  tier: Tier;
  /** Buyable tiers go to on-site checkout by default; 'whatsapp' keeps the phase 1 prefilled message. */
  cta?: 'whatsapp' | 'checkout';
}

const GST_NOTE = `+${Math.round(catalogue.gst * 100)}% GST`;

function duration(tier: Tier): string | null {
  if (tier.weeks) return `${tier.weeks} ${tier.weeks === 1 ? 'week' : 'weeks'}`;
  if (tier.days) return `${tier.days} ${tier.days === 1 ? 'day' : 'days'}`;
  return null;
}

function TierCta({ service, tier, cta = 'checkout' }: TierCardProps) {
  const page = pagePath(useLocation().pathname);
  const quote = `/contact?tier=${tier.id}`;

  if (!tier.buyable) {
    return (
      <Button to={quote} variant="secondary" className="w-full">
        Get a quote
      </Button>
    );
  }

  const label = `Buy ${tier.label}`;

  if (cta === 'checkout') {
    return (
      <Button
        to={`/checkout/${tier.id}/`}
        onClick={() => track('begin_checkout', { tier: tier.id, from: 'tier_card' })}
        className="w-full"
      >
        {label}
        <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
      </Button>
    );
  }

  const href = waLink(tierMessage(service.name, tier.label, tier.price));

  // WhatsApp not configured: the buy CTA goes to the contact page, so count it as a booking click.
  if (href === '/contact') {
    return (
      <Button to={quote} onClick={() => track('book_click', { page, via: 'contact' })} className="w-full">
        {label}
      </Button>
    );
  }

  return (
    <Button href={href} onClick={() => track('whatsapp_click', { tier: tier.id })} className="w-full">
      <WhatsappLogo size={18} aria-hidden="true" />
      {label}
    </Button>
  );
}

/**
 * Fires `view_tier` once, the first time the card is on screen, so a pricing
 * page with many cards does not record every tier on every visit.
 */
function useViewTier(tier: Tier) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!tier.buyable || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      track('view_tier', { tier: tier.id });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        track('view_tier', { tier: tier.id });
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tier.buyable, tier.id]);

  return ref;
}

/** One package: name, price ex-GST, what is included, and the way to buy or ask. */
export function TierCard({ service, tier, cta }: TierCardProps) {
  const time = duration(tier);
  const price = tier.price !== null ? formatINR(tier.price) : `From ${formatINR(tier.from!)}`;
  const note = tier.payment ?? tier.terms;
  const ref = useViewTier(tier);

  return (
    <article
      ref={ref}
      id={tier.id}
      className={`card relative flex h-full flex-col p-7 md:p-8 ${tier.badge ? 'border-line-strong' : ''}`}
    >
      {tier.badge && (
        <Pill tone="accent" className="absolute -top-3 left-7 bg-surface md:left-8">
          {tier.badge}
        </Pill>
      )}

      <header>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="display-3">{tier.label}</h3>
          {time && <span className="label-mono">{time}</span>}
        </div>
        <p className="mt-2 text-ink-2">{tier.tagline}</p>
      </header>

      <div className="mt-8 border-t border-line pt-6">
        <p className="font-display text-[2.5rem] leading-none font-semibold tracking-[-0.035em] text-ink tabular-nums">
          {price}
        </p>
        <p className="label-mono mt-3">{GST_NOTE}</p>
        {note && <p className="mt-4 text-sm text-muted">{note}</p>}
      </div>

      <ul className="mt-7 flex flex-col gap-3 text-[15px] leading-snug text-ink-2">
        {tier.includes.map((line) => (
          <li key={line} className="flex gap-3">
            <Check size={14} weight="bold" aria-hidden="true" className="mt-[3px] shrink-0 text-accent" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-9">
        <TierCta service={service} tier={tier} cta={cta} />
      </div>
    </article>
  );
}
