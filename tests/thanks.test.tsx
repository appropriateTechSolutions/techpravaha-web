import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../app/lib/analytics', () => ({ track: vi.fn() }));

import { track } from '../app/lib/analytics';
import ThanksPage from '../app/routes/thanks';

const trackMock = vi.mocked(track);

const ID = 'order_TEST1234567890';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const created = () => json({ status: 'created', tier: 'Launch', service: 'Websites & landing pages', amountPaise: 4130000 });
const paid = () => json({ status: 'paid', tierId: 'websites-launch', tier: 'Launch', service: 'Websites & landing pages', amountPaise: 4130000 });

let fetchMock: ReturnType<typeof vi.fn>;

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  trackMock.mockReset();
  window.sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
  vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
  // analytics is mocked; the page only checks that gtag has loaded before it reports a purchase.
  vi.stubGlobal('gtag', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/thanks', Component: ThanksPage }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('thanks page', () => {
  it('without an order shows the generic thanks and polls nothing', async () => {
    renderAt('/thanks');
    await tick(5_000);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thank you.');
    expect(screen.getByRole('status')).toHaveTextContent(/receipt is on its way/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says "confirmed" only after the status endpoint returns paid', async () => {
    fetchMock.mockResolvedValueOnce(created()).mockResolvedValueOnce(created()).mockResolvedValue(paid());
    renderAt(`/thanks?order=${ID}`);
    await tick(0);

    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.example.test/orders/${ID}/status`);
    expect(screen.getByRole('status')).toHaveTextContent('Confirming your payment…');
    expect(screen.queryByText(/confirmed/i)).not.toBeInTheDocument();

    await tick(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/confirmed/i)).not.toBeInTheDocument();
    expect(trackMock).not.toHaveBeenCalled();

    await tick(2_000);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
    expect(screen.getByText(/₹41,300/)).toBeInTheDocument();

    const intake = screen.getByRole('link', { name: /intake form/i });
    expect(intake).toHaveAttribute('href', `/contact/?order=${ID}&tier=websites-launch`);

    // Polling stops once paid.
    await tick(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('tracks purchase exactly once, with the paid amount', async () => {
    fetchMock.mockResolvedValue(paid());
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    await tick(10_000);
    const purchases = trackMock.mock.calls.filter(([name]) => name === 'purchase');
    expect(purchases).toEqual([
      ['purchase', { transaction_id: ID, value: 41300, currency: 'INR', tier: 'websites-launch' }],
    ]);
  });

  it('does not track purchase again when the page is opened a second time for the same order', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(paid()));
    const first = renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
    first.unmount();

    // A reload: fresh component, same tab.
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
    expect(trackMock.mock.calls.filter(([name]) => name === 'purchase')).toHaveLength(1);
  });

  it('still tracks purchase when sessionStorage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fetchMock.mockResolvedValue(paid());
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(trackMock.mock.calls.filter(([name]) => name === 'purchase')).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it('uses tierId from the response even when the label no longer matches the catalogue', async () => {
    fetchMock.mockResolvedValue(
      json({ status: 'paid', tierId: 'apps-launch', tier: 'Renamed', service: 'Gone', amountPaise: 100 }),
    );
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('link', { name: /intake form/i })).toHaveAttribute(
      'href',
      `/contact/?order=${ID}&tier=apps-launch`,
    );
    expect(trackMock).toHaveBeenCalledWith('purchase', expect.objectContaining({ tier: 'apps-launch' }));
  });

  it('falls back to the catalogue label mapping when tierId is absent (older Worker)', async () => {
    fetchMock.mockResolvedValue(
      json({ status: 'paid', tier: 'Launch', service: 'Websites & landing pages', amountPaise: 4130000 }),
    );
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('link', { name: /intake form/i })).toHaveAttribute(
      'href',
      `/contact/?order=${ID}&tier=websites-launch`,
    );
  });

  it('falls back to the plain intake link when the tier cannot be resolved', async () => {
    fetchMock.mockResolvedValue(json({ status: 'paid', tier: 'Retired', service: 'Gone', amountPaise: 100 }));
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('link', { name: /intake form/i })).toHaveAttribute('href', `/contact/?order=${ID}`);
  });

  it('shows the pending copy after 30 s, keeps polling every 5 s and stops at 2 minutes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(created()));
    renderAt(`/thanks?order=${ID}`);
    await tick(29_000);
    expect(screen.getByRole('status')).toHaveTextContent('Confirming your payment…');

    await tick(1_000);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      `Razorpay has your payment. Your receipt is on its way. If it does not arrive in 10 minutes, message us on WhatsApp with order ${ID}.`,
    );
    expect(screen.queryByText(/confirmed/i)).not.toBeInTheDocument();

    // Still asking, but every 5 s now.
    let calls = fetchMock.mock.calls.length;
    await tick(10_000);
    expect(fetchMock.mock.calls.length - calls).toBe(2);

    // Two minutes in total, then it stops; the pending copy stays.
    await tick(80_000);
    calls = fetchMock.mock.calls.length;
    await tick(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    expect(screen.getByRole('status')).toHaveTextContent('Razorpay has your payment.');
    expect(trackMock).not.toHaveBeenCalledWith('purchase', expect.anything());
  });

  it('switches to confirmed and tracks purchase when "paid" arrives after the pending copy (KV propagation)', async () => {
    let paidNow = false;
    fetchMock.mockImplementation(() => Promise.resolve(paidNow ? paid() : created()));
    renderAt(`/thanks?order=${ID}`);
    await tick(30_000);
    expect(screen.getByRole('status')).toHaveTextContent('Razorpay has your payment.');
    expect(trackMock).not.toHaveBeenCalled();

    paidNow = true; // the webhook's write reaches this edge location about a minute in
    await tick(25_000);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
    expect(trackMock.mock.calls.filter(([name]) => name === 'purchase')).toEqual([
      ['purchase', { transaction_id: ID, value: 41300, currency: 'INR', tier: 'websites-launch' }],
    ]);
    const calls = fetchMock.mock.calls.length;
    await tick(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it('skips purchase and leaves the flag unset when gtag has not loaded, so a later load can report it', async () => {
    vi.stubGlobal('gtag', undefined);
    fetchMock.mockImplementation(() => Promise.resolve(paid()));
    const first = renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
    expect(trackMock).not.toHaveBeenCalledWith('purchase', expect.anything());
    expect(window.sessionStorage.getItem(`tp-purchase:${ID}`)).toBeNull();
    first.unmount();

    // Reload with analytics loaded: the purchase is reported once.
    vi.stubGlobal('gtag', vi.fn());
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(trackMock.mock.calls.filter(([name]) => name === 'purchase')).toHaveLength(1);
    expect(window.sessionStorage.getItem(`tp-purchase:${ID}`)).toBe('1');
  });

  it('shows the deposit paid and the balance at launch for a part-paid order', async () => {
    fetchMock.mockResolvedValue(
      json({
        status: 'paid',
        tierId: 'websites-growth',
        tier: 'Growth',
        service: 'Websites & landing pages',
        amountPaise: 5605000,
        totalPaise: 11210000,
        depositPct: 50,
      }),
    );
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByText('₹56,050 paid (50% deposit), GST included')).toBeInTheDocument();
    expect(screen.getByText('Balance at launch: ₹56,050')).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith('purchase', expect.objectContaining({ value: 56050 }));
  });

  it('shows no balance line for an order paid in full', async () => {
    fetchMock.mockResolvedValue(json({ status: 'paid', tierId: 'websites-launch', tier: 'Launch', service: 'Websites & landing pages', amountPaise: 4130000, totalPaise: 4130000, depositPct: 100 }));
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByText('₹41,300 paid, GST included')).toBeInTheDocument();
    expect(screen.queryByText(/Balance at launch/)).not.toBeInTheDocument();
  });

  it('treats a 404 from the status endpoint as pending, not as an error', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ error: 'not found' }, 404)));
    renderAt(`/thanks?order=${ID}`);
    await tick(30_000);
    expect(screen.getByRole('status')).toHaveTextContent('Razorpay has your payment.');
  });

  it('keeps polling through network errors', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(paid());
    renderAt(`/thanks?order=${ID}`);
    await tick(0);
    expect(screen.getByRole('status')).toHaveTextContent('Confirming your payment…');
    await tick(2_000);
    expect(screen.getByRole('status')).toHaveTextContent('Payment confirmed.');
  });

  it('stops polling when the page unmounts', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(created()));
    const { unmount } = renderAt(`/thanks?order=${ID}`);
    await tick(0);
    const calls = fetchMock.mock.calls.length;
    unmount();
    await tick(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it('treats a malformed order id as no order', async () => {
    renderAt('/thanks?order=%3Cscript%3E');
    await tick(5_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/receipt is on its way/);
  });
});
