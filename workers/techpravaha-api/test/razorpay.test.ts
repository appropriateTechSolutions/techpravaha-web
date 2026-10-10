import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrder, RazorpayError, verifyWebhookSignature } from '../src/razorpay';

const env = { RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'shh_secret' };
const input = { amountPaise: 4130000, receipt: 'tp_websites-launch_abc', notes: { tierId: 'websites-launch' } };

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createOrder', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('POSTs to the Orders API with Basic auth and the given amount', async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      ok({ id: 'order_x', amount: 4130000, currency: 'INR', receipt: input.receipt, status: 'created' }),
    );
    const order = await createOrder(env, input, fetchImpl as unknown as typeof fetch);
    expect(order).toEqual({ id: 'order_x', amount: 4130000, currency: 'INR' });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://api.razorpay.com/v1/orders');
    expect(init!.method).toBe('POST');
    const headers = new Headers(init!.headers);
    expect(headers.get('Authorization')).toBe(`Basic ${btoa('rzp_test_key:shh_secret')}`);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init!.body))).toEqual({
      amount: 4130000,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
    });
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws RazorpayError on a non-2xx and logs the provider body', async () => {
    const fetchImpl = vi.fn(async () => ok({ error: { description: 'secret provider detail' } }, 500));
    await expect(createOrder(env, input, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(RazorpayError);
    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls)).toContain(
      'secret provider detail',
    );
  });

  it('throws RazorpayError when the upstream call times out', async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason));
        }),
    );
    await expect(
      createOrder(env, input, fetchImpl as unknown as typeof fetch, { timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(RazorpayError);
  });

  it('throws when the provider echoes a different amount or currency', async () => {
    const wrongAmount = vi.fn(async () => ok({ id: 'order_x', amount: 100, currency: 'INR' }));
    await expect(createOrder(env, input, wrongAmount as unknown as typeof fetch)).rejects.toBeInstanceOf(RazorpayError);
    const wrongCurrency = vi.fn(async () => ok({ id: 'order_x', amount: 4130000, currency: 'USD' }));
    await expect(createOrder(env, input, wrongCurrency as unknown as typeof fetch)).rejects.toBeInstanceOf(
      RazorpayError,
    );
  });

  it('refuses to call the provider without credentials', async () => {
    const fetchImpl = vi.fn(async () => ok({}));
    await expect(
      createOrder({ RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '' }, input, fetchImpl as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RazorpayError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses a non-positive or fractional amount', async () => {
    const fetchImpl = vi.fn(async () => ok({}));
    for (const amountPaise of [0, -100, 10.5, Number.NaN]) {
      await expect(
        createOrder(env, { ...input, amountPaise }, fetchImpl as unknown as typeof fetch),
      ).rejects.toBeInstanceOf(RazorpayError);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_123';
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
  const good = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts the correct signature for the raw body', async () => {
    expect(await verifyWebhookSignature(secret, body, good)).toBe(true);
  });

  it('accepts an upper-case hex rendering of the same signature', async () => {
    expect(await verifyWebhookSignature(secret, body, good.toUpperCase())).toBe(true);
  });

  it('rejects a tampered body', async () => {
    expect(await verifyWebhookSignature(secret, body.replace('pay_1', 'pay_2'), good)).toBe(false);
    expect(await verifyWebhookSignature(secret, body + ' ', good)).toBe(false);
  });

  it('rejects a signature made with a different secret', async () => {
    const other = createHmac('sha256', 'other').update(body).digest('hex');
    expect(await verifyWebhookSignature(secret, body, other)).toBe(false);
  });

  it('rejects a single flipped nibble at the start, middle or end', async () => {
    for (const i of [0, 31, 63]) {
      const swapped = good[i] === '0' ? '1' : '0';
      expect(await verifyWebhookSignature(secret, body, good.slice(0, i) + swapped + good.slice(i + 1))).toBe(false);
    }
  });

  it('rejects wrong-length, empty, null and non-hex signatures', async () => {
    expect(await verifyWebhookSignature(secret, body, good.slice(0, -2))).toBe(false);
    expect(await verifyWebhookSignature(secret, body, good + '00')).toBe(false);
    expect(await verifyWebhookSignature(secret, body, good.slice(0, 63))).toBe(false);
    expect(await verifyWebhookSignature(secret, body, '')).toBe(false);
    expect(await verifyWebhookSignature(secret, body, null)).toBe(false);
    expect(await verifyWebhookSignature(secret, body, 'z'.repeat(64))).toBe(false);
    expect(await verifyWebhookSignature(secret, body, ` ${good.slice(1)}`)).toBe(false);
  });

  it('never verifies when the secret is unset', async () => {
    const emptyKeySig = createHmac('sha256', '').update(body).digest('hex');
    expect(await verifyWebhookSignature('', body, emptyKeySig)).toBe(false);
  });
});
