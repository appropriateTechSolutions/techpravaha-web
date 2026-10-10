import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useRouteError } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../app/lib/analytics', () => ({ track: vi.fn() }));

// The real loader is exercised in its own block below; the page tests decide what it does.
vi.mock('../app/lib/razorpay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/lib/razorpay')>();
  return { ...actual, loadCheckout: vi.fn() };
});

import { track } from '../app/lib/analytics';
import { loadCheckout, type RazorpayOptions } from '../app/lib/razorpay';
import CheckoutPage from '../app/routes/checkout.$tierId';
import { chargedNow, formatINR, getTier, withGst } from '../app/lib/catalogue';

const trackMock = vi.mocked(track);
const loadMock = vi.mocked(loadCheckout);

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** Records every Razorpay instance the page builds. */
let opened: RazorpayOptions[] = [];
class FakeRazorpay {
  constructor(public options: RazorpayOptions) {}
  open() {
    opened.push(this.options);
  }
}

const ORDER = {
  orderId: 'order_TEST1234567890',
  amount: 4130000,
  currency: 'INR',
  keyId: 'rzp_test_abc123',
  tier: { label: 'Launch' },
  service: { name: 'Websites & landing pages' },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  opened = [];
  trackMock.mockReset();
  loadMock.mockReset();
  loadMock.mockResolvedValue(FakeRazorpay as never);
  // A fresh Response per call: a body can be read only once.
  fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json(ORDER)));
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
  vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_abc123');
  vi.stubEnv('VITE_API_URL', 'https://api.example.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function Boundary() {
  // A `data()` thrown during render arrives as { init: { status } }, not a Response.
  const error = useRouteError() as { status?: number; init?: { status?: number } };
  return <p>{`boundary ${error?.init?.status ?? error?.status}`}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/checkout/:tierId', Component: CheckoutPage, ErrorBoundary: Boundary },
      { path: '/thanks', Component: () => <p>thanks page</p> },
      { path: '*', Component: () => null },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValid() {
  fill(/^name/i, 'Asha Rao');
  fill(/^email/i, 'asha@example.com');
  fill(/^phone/i, '98765 43210');
}

/** The submit button; its label moves from "Pay ₹…" to "Opening…" to "Waiting…". */
const payButton = () => screen.getByRole('button', { name: /^(Pay ₹|Opening secure checkout|Waiting for payment)/ });

describe('checkout page', () => {
  it('shows the Launch total with GST for websites-launch', () => {
    renderAt('/checkout/websites-launch');
    const summary = screen.getByRole('complementary', { name: /order summary/i });
    expect(within(summary).getByText('₹35,000')).toBeInTheDocument();
    expect(within(summary).getByText('₹6,300')).toBeInTheDocument();
    expect(within(summary).getAllByText('₹41,300').length).toBeGreaterThan(0);
    expect(payButton()).toHaveTextContent('Pay ₹41,300');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Websites & landing pages · Launch');
  });

  it('shows a Growth tier as a 50% deposit now and the balance at launch', () => {
    const { tier } = getTier('websites-growth')!;
    const total = withGst(tier.price!);
    const deposit = chargedNow(tier as typeof tier & { price: number });
    expect(deposit).toBe(56050);
    renderAt('/checkout/websites-growth');
    const summary = screen.getByRole('complementary', { name: /order summary/i });
    expect(within(summary).getByText(formatINR(total))).toBeInTheDocument();
    expect(within(summary).getByText(/Charged now/)).toHaveTextContent(`Charged now: ${formatINR(deposit)} (50% deposit)`);
    expect(within(summary).getByText(/Balance at launch/)).toHaveTextContent(
      `Balance at launch: ${formatINR(total - deposit)}`,
    );
    expect(payButton()).toHaveTextContent(`Pay ${formatINR(deposit)}`);
  });

  it('shows a Launch tier as charged in full, with no deposit or balance line', () => {
    renderAt('/checkout/websites-launch');
    expect(screen.getByText(/Charged now/)).toHaveTextContent(/^Charged now: ₹41,300$/);
    expect(screen.queryByText(/deposit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Balance at launch/)).not.toBeInTheDocument();
  });

  it('refuses to open Razorpay when the Worker amount differs from the page (stale Worker)', async () => {
    // e.g. the catalogue price was lowered and merged, but the Worker was not redeployed.
    fetchMock.mockImplementation(() => Promise.resolve(json({ ...ORDER, amount: 4130000 + 100 })));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Checkout did not open. Nothing was charged.');
    expect(alert).toHaveTextContent('Please message us; nothing was charged.');
    expect(within(alert).getByRole('link', { name: /WhatsApp/ })).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith('checkout_mismatch', { tier: 'websites-launch' });
    expect(loadMock).not.toHaveBeenCalled();
    expect(opened).toHaveLength(0);
    expect(payButton()).not.toHaveAttribute('aria-disabled');

    // A retry asks the Worker again rather than reusing the refused order.
    fireEvent.click(payButton());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(opened).toHaveLength(0);
  });

  it('refuses a non-INR order from the Worker', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ ...ORDER, currency: 'USD' })));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Please message us; nothing was charged.');
    expect(trackMock).toHaveBeenCalledWith('checkout_mismatch', { tier: 'websites-launch' });
    expect(opened).toHaveLength(0);
  });

  it('opens Razorpay for a Growth tier when the Worker charges the 50% deposit', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ ...ORDER, amount: 5605000, tier: { label: 'Growth' } })),
    );
    renderAt('/checkout/websites-growth');
    fillValid();
    fireEvent.click(payButton());
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0].amount).toBe(5605000);
    expect(trackMock).not.toHaveBeenCalledWith('checkout_mismatch', expect.anything());
  });

  it('shows no mismatch line on an ordinary Checkout.js failure', async () => {
    loadMock.mockRejectedValue(new Error('blocked'));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    expect(await screen.findByRole('alert')).not.toHaveTextContent('Please message us');
  });

  it('throws a 404 for a quote-only tier', () => {
    renderAt('/checkout/apps-growth');
    expect(screen.getByText('boundary 404')).toBeInTheDocument();
  });

  it('throws a 404 for an unknown tier', () => {
    renderAt('/checkout/nope');
    expect(screen.getByText('boundary 404')).toBeInTheDocument();
  });

  it('links the consent line to the terms and the refund policy', () => {
    renderAt('/checkout/websites-launch');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Refund policy' })).toHaveAttribute('href', '/refunds');
  });

  it('rejects an invalid GSTIN inline and does not call the API', () => {
    renderAt('/checkout/websites-launch');
    fillValid();
    fill(/^GSTIN/i, '27ABCDE1234F1X5');
    fireEvent.click(payButton());

    const gstin = screen.getByLabelText(/^GSTIN/i);
    expect(gstin).toHaveAttribute('aria-invalid', 'true');
    expect(gstin).toHaveAccessibleDescription(/GSTIN does not look right/);
    expect(document.activeElement).toBe(gstin);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an Indian mobile number', () => {
    renderAt('/checkout/websites-launch');
    fill(/^name/i, 'Asha Rao');
    fill(/^email/i, 'asha@example.com');
    fill(/^phone/i, '12345');
    fireEvent.click(payButton());
    expect(screen.getByLabelText(/^phone/i)).toHaveAccessibleDescription(/10-digit Indian mobile/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates the order, opens Razorpay with the Worker amount and goes to /thanks on success', async () => {
    const router = renderAt('/checkout/websites-launch');
    fillValid();
    fill(/^company/i, 'Rao Bakes');
    fill(/^GSTIN/i, '27abcde1234f1z5');
    fireEvent.click(payButton());

    expect(trackMock).toHaveBeenCalledWith('begin_checkout', { tier: 'websites-launch', from: 'pay' });
    await vi.waitFor(() => expect(opened).toHaveLength(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/orders');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      tierId: 'websites-launch',
      customer: {
        name: 'Asha Rao',
        email: 'asha@example.com',
        phone: '98765 43210',
        company: 'Rao Bakes',
        gstin: '27ABCDE1234F1Z5',
      },
      page: '/checkout/websites-launch',
    });

    const options = opened[0];
    expect(options).toMatchObject({
      key: 'rzp_test_abc123',
      amount: 4130000,
      currency: 'INR',
      order_id: 'order_TEST1234567890',
      name: 'Tech Pravaha',
      description: 'Websites & landing pages · Launch',
      prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '98765 43210' },
    });
    expect(options.theme?.color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(payButton()).toHaveAttribute('aria-disabled', 'true');

    act(() => {
      options.handler({ razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_TEST1234567890', razorpay_signature: 's' });
    });
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/thanks'));
    expect(router.state.location.search).toBe('?order=order_TEST1234567890');
  });

  it('re-enables the button when the Razorpay window is dismissed', async () => {
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(payButton()).toHaveAttribute('aria-disabled', 'true');
    act(() => opened[0].modal?.ondismiss?.());
    expect(payButton()).not.toHaveAttribute('aria-disabled');
    expect(payButton()).toHaveTextContent('Pay ₹41,300');
    expect(document.activeElement).toBe(payButton());
  });

  it('announces each busy step in a status region mounted from the start', async () => {
    let release!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (release = r)));
    renderAt('/checkout/websites-launch');
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    fillValid();
    fireEvent.click(payButton());
    expect(status).toHaveTextContent('Opening secure checkout…');
    // Still focusable while busy: aria-disabled, not disabled.
    expect(payButton()).not.toBeDisabled();

    await act(async () => release(json(ORDER)));
    await vi.waitFor(() => expect(status).toHaveTextContent('Waiting for payment…'));
    act(() => opened[0].modal?.ondismiss?.());
    expect(status).toBeEmptyDOMElement();
  });

  it('creates one order when Pay is pressed twice in a row', async () => {
    let release!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (release = r)));
    renderAt('/checkout/websites-launch');
    fillValid();
    const form = screen.getByRole('form', { name: 'Checkout' });
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.click(payButton());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(trackMock.mock.calls.filter(([n]) => n === 'begin_checkout')).toHaveLength(1);
    await act(async () => release(json(ORDER)));
    await vi.waitFor(() => expect(opened).toHaveLength(1));
  });

  it('reuses the Worker order when Checkout.js fails once and the buyer retries', async () => {
    loadMock.mockRejectedValueOnce(new Error('blocked'));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    await screen.findByRole('alert');

    fireEvent.click(payButton());
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(opened[0].order_id).toBe('order_TEST1234567890');
  });

  it('creates a fresh order when the details change before the retry', async () => {
    loadMock.mockRejectedValueOnce(new Error('blocked'));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    await screen.findByRole('alert');

    fill(/^email/i, 'asha.rao@example.com');
    fireEvent.click(payButton());
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a pasted zero-width character and a non-ASCII email locally, like the Worker', () => {
    renderAt('/checkout/websites-launch');
    fillValid();
    fill(/^name/i, 'Asha\u200bRao');
    fill(/^email/i, 'ásha@example.com');
    fireEvent.click(payButton());
    expect(screen.getByLabelText(/^name/i)).toHaveAccessibleDescription(/hidden character/);
    expect(screen.getByLabelText(/^email/i)).toHaveAccessibleDescription(/does not look right/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the WhatsApp fallback and re-enables the button when Checkout.js fails to load', async () => {
    loadMock.mockRejectedValue(new Error('blocked'));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Nothing was charged.');
    // Focus moves to the message, so a phone scrolls to it and a screen reader reads it.
    expect(document.activeElement).toBe(alert);
    const wa = within(alert).getByRole('link', { name: /WhatsApp/ });
    // WhatsApp is unset in tests, so the control falls back to /contact; the message is checked below.
    expect(wa).toHaveAttribute('href', expect.stringMatching(/wa\.me|\/contact/));
    expect(payButton()).not.toHaveAttribute('aria-disabled');
    expect(opened).toHaveLength(0);
  });

  it('shows the fallback on a 502 from the Worker and on a network error', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'payment provider error' }, 502));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout did not open.');
    expect(payButton()).not.toHaveAttribute('aria-disabled');
    expect(loadMock).not.toHaveBeenCalled();

    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    fireEvent.click(payButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout did not open.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payButton()).not.toHaveAttribute('aria-disabled');
  });

  it('maps a 400 with fields to inline errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid fields', fields: ['phone'] }, 400));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());

    await vi.waitFor(() => expect(screen.getByLabelText(/^phone/i)).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText(/^phone/i)).toHaveAccessibleDescription(/10-digit Indian mobile/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(payButton()).not.toHaveAttribute('aria-disabled');
  });

  it('maps the Worker field names (customer.email) too', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid fields', fields: ['customer.email'] }, 400));
    renderAt('/checkout/websites-launch');
    fillValid();
    fireEvent.click(payButton());
    await vi.waitFor(() => expect(screen.getByLabelText(/^email/i)).toHaveAttribute('aria-invalid', 'true'));
  });

  it('replaces the Pay button with the WhatsApp fallback while the key id is a placeholder', () => {
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_XXXXXXXXXXXX');
    renderAt('/checkout/websites-launch');
    expect(screen.queryByRole('button', { name: /^Pay ₹/ })).not.toBeInTheDocument();
    expect(screen.getByText('Online payment is not switched on yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toBeInTheDocument();
    // The total stays on the page.
    expect(screen.getAllByText('₹41,300').length).toBeGreaterThan(0);
  });

  it('treats an unset key id as switched off', () => {
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', '');
    renderAt('/checkout/websites-launch');
    expect(screen.queryByRole('button', { name: /^Pay ₹/ })).not.toBeInTheDocument();
  });
});

describe('createOrder timeout', () => {
  afterEach(() => vi.useRealTimers());

  it('still times out when the Worker sends headers and then stalls on the body', async () => {
    vi.useFakeTimers();
    const { createOrder, ApiError } = await vi.importActual<typeof import('../app/lib/api')>('../app/lib/api');
    fetchMock.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      }),
    );
    const settled = createOrder({
      tierId: 'websites-launch',
      customer: { name: 'Asha', email: 'a@example.com', phone: '9876543210' },
      page: '/checkout/websites-launch',
    }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20_000);
    const err = await settled;
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).status).toBe(0);
  });
});

describe('loadCheckout (real)', () => {
  const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
  let real: typeof import('../app/lib/razorpay').loadCheckout;

  beforeEach(async () => {
    vi.resetModules();
    document.head.querySelectorAll('script').forEach((s) => s.remove());
    delete (window as { Razorpay?: unknown }).Razorpay;
    ({ loadCheckout: real } = await vi.importActual<typeof import('../app/lib/razorpay')>('../app/lib/razorpay'));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as { Razorpay?: unknown }).Razorpay;
  });

  const scripts = () => document.querySelectorAll(`script[src="${SRC}"]`);

  it('injects the script once and resolves with window.Razorpay', async () => {
    const a = real();
    const b = real();
    expect(scripts()).toHaveLength(1);
    (window as { Razorpay?: unknown }).Razorpay = FakeRazorpay;
    scripts()[0].dispatchEvent(new Event('load'));
    await expect(a).resolves.toBe(FakeRazorpay);
    await expect(b).resolves.toBe(FakeRazorpay);
    await expect(real()).resolves.toBe(FakeRazorpay);
    expect(scripts()).toHaveLength(1);
  });

  it('rejects on a script error and injects afresh on the next try', async () => {
    const a = real();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(a).rejects.toThrow();
    expect(scripts()).toHaveLength(0);
    void real().catch(() => {});
    expect(scripts()).toHaveLength(1);
  });

  it('rejects after 8 s when the script never arrives', async () => {
    vi.useFakeTimers();
    const a = real();
    const settled = vi.fn();
    a.catch(settled);
    await vi.advanceTimersByTimeAsync(7_999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalled();
  });
});
