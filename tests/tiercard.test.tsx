import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatINR, getTier } from '../app/lib/catalogue';

// jsdom has no IntersectionObserver; this stub lets a test decide when a card is seen.
let observers: { cb: (entries: Partial<IntersectionObserverEntry>[]) => void; disconnected: boolean }[] = [];
class IO {
  private rec: (typeof observers)[number];
  constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
    this.rec = { cb, disconnected: false };
    observers.push(this.rec);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.rec.disconnected = true;
  }
}
const seen = (isIntersecting: boolean) =>
  act(() => observers.filter((o) => !o.disconnected).forEach((o) => o.cb([{ isIntersecting }])));

// TierCard reads VITE_WHATSAPP_NUMBER at module load (via lib/whatsapp), so each
// case stubs the env and imports fresh modules.
async function renderTier(tierId: string, number: string, cta?: 'whatsapp' | 'checkout') {
  vi.resetModules();
  vi.stubEnv('VITE_WHATSAPP_NUMBER', number);
  const { TierCard } = await import('../app/components/TierCard');
  const { getTier } = await import('../app/lib/catalogue');
  const { service, tier } = getTier(tierId)!;
  return render(
    <MemoryRouter>
      <TierCard service={service} tier={tier} {...(cta ? { cta } : {})} />
    </MemoryRouter>,
  );
}

// The first import of the component graph is the slow part (seconds under parallel load). Do it once
// here, with a generous timeout, so no test pays for it; the per-test re-imports are then cache hits.
beforeAll(async () => {
  await import('../app/components/TierCard');
}, 30_000);

beforeEach(() => {
  observers = [];
  vi.stubGlobal('IntersectionObserver', IO);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('TierCard', () => {
  it('buyable tier by default: links to /checkout/<id>/ and fires begin_checkout on click', async () => {
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    await renderTier('websites-launch', '919999999999');

    expect(screen.getByText(formatINR(getTier('websites-launch')!.tier.price!))).toBeInTheDocument();
    expect(screen.getByText('+18% GST')).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: 'Buy Launch' });
    expect(cta).toHaveAttribute('href', '/checkout/websites-launch/');
    expect(cta).not.toHaveAttribute('target');

    const viewTier = () => gtag.mock.calls.filter(([, name]) => name === 'view_tier');
    expect(viewTier()).toEqual([]);
    seen(true);
    expect(viewTier()).toEqual([['event', 'view_tier', { tier: 'websites-launch' }]]);
    seen(true);
    expect(viewTier()).toHaveLength(1);

    cta.addEventListener('click', (e) => e.preventDefault()); // keep the router from navigating
    cta.click();
    expect(gtag).toHaveBeenCalledWith('event', 'begin_checkout', { tier: 'websites-launch', from: 'tier_card' });
    expect(gtag.mock.calls.some(([, name]) => name === 'whatsapp_click')).toBe(false);
  });

  it('buyable tier with cta="whatsapp": price, GST note and a wa.me link when the number is set', async () => {
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    await renderTier('websites-launch', '919999999999', 'whatsapp');

    expect(screen.getByText(formatINR(getTier('websites-launch')!.tier.price!))).toBeInTheDocument();
    expect(screen.getByText('+18% GST')).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /buy/i });
    expect(cta.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
    expect(decodeURIComponent(cta.getAttribute('href')!)).toContain('Websites & landing pages · Launch');
    expect(cta).toHaveAttribute('target', '_blank');

    const viewTier = () => gtag.mock.calls.filter(([, name]) => name === 'view_tier');
    // Mounting alone does not count as a view.
    expect(viewTier()).toEqual([]);
    seen(false);
    expect(viewTier()).toEqual([]);
    seen(true);
    expect(viewTier()).toEqual([['event', 'view_tier', { tier: 'websites-launch' }]]);
    // Once only: a second intersection report records nothing more.
    seen(true);
    expect(viewTier()).toHaveLength(1);
    cta.click();
    expect(gtag).toHaveBeenCalledWith('event', 'whatsapp_click', { tier: 'websites-launch' });
  });

  it('buyable tier with cta="whatsapp": links to /contact with the tier when the number is not set', async () => {
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    await renderTier('websites-launch', '91XXXXXXXXXX', 'whatsapp');

    const cta = screen.getByRole('link', { name: /buy/i });
    expect(cta).toHaveAttribute('href', '/contact?tier=websites-launch');
    expect(cta).not.toHaveAttribute('target');

    cta.click();
    expect(gtag).toHaveBeenCalledWith('event', 'book_click', { page: '/', via: 'contact' });
    expect(gtag.mock.calls.some(([, name]) => name === 'whatsapp_click')).toBe(false);
  });

  it('quote tier: "From" price and a link to /contact?tier=<id>', async () => {
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    await renderTier('apps-growth', '919999999999');
    seen(true);
    expect(gtag.mock.calls.some(([, name]) => name === 'view_tier')).toBe(false);

    expect(screen.getByText(`From ${formatINR(getTier('apps-growth')!.tier.from!)}`)).toBeInTheDocument();
    expect(screen.getByText('+18% GST')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Get a quote' });
    expect(cta).toHaveAttribute('href', '/contact?tier=apps-growth');
    expect(screen.queryByRole('link', { name: /buy/i })).toBeNull();
  });

  it('renders the badge and every include', async () => {
    await renderTier('websites-growth', '919999999999');
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });
});
