import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { getOrder, getPaymentOrderId, markPaid, putOrder, type OrderRecord } from '../src/orders';
import { normalisePhone, validateOrderBody } from '../src/validate';
import { fakeKV, type FakeKV } from './helpers/fake-kv';

const ctx = {} as ExecutionContext;

const customer = { name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210' };

function record(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order_1',
    tierId: 'websites-launch',
    serviceName: 'Websites & landing pages',
    tierLabel: 'Launch',
    amountPaise: 4130000,
    gst: 0.18,
    customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210' },
    status: 'created',
    createdAt: '2026-10-10T00:00:00.000Z',
    ...over,
  };
}

describe('order store', () => {
  let kv: FakeKV;
  beforeEach(() => {
    kv = fakeKV();
  });

  it('round-trips an order under order:<id>', async () => {
    await putOrder(kv, record());
    expect(kv.map.has('order:order_1')).toBe(true);
    expect(await getOrder(kv, 'order_1')).toEqual(record());
    expect(await getOrder(kv, 'order_nope')).toBeNull();
  });

  it('markPaid updates a created order and writes the payment index', async () => {
    await putOrder(kv, record());
    const outcome = await markPaid(kv, 'order_1', 'pay_1');
    expect(outcome.result).toBe('updated');
    const o = await getOrder(kv, 'order_1');
    expect(o).toMatchObject({ status: 'paid', paymentId: 'pay_1' });
    expect(outcome.order).toEqual(o); // the record it wrote, so callers need no second read
    expect(typeof o!.paidAt).toBe('string');
    expect(await getPaymentOrderId(kv, 'pay_1')).toBe('order_1');
  });

  it('markPaid is idempotent: a second call returns already and writes nothing', async () => {
    await putOrder(kv, record());
    await markPaid(kv, 'order_1', 'pay_1');
    const before = kv.map.get('order:order_1');
    const writes = kv.puts.length;
    const again = await markPaid(kv, 'order_1', 'pay_1');
    expect(again.result).toBe('already');
    expect(again.order).toMatchObject({ status: 'paid', paymentId: 'pay_1' });
    expect(kv.puts.length).toBe(writes);
    expect(kv.map.get('order:order_1')).toBe(before);
  });

  it('markPaid on a missing order returns missing but still records the payment index', async () => {
    expect(await markPaid(kv, 'order_ghost', 'pay_9')).toEqual({ result: 'missing', order: null });
    expect(kv.map.has('order:order_ghost')).toBe(false);
    expect(await getPaymentOrderId(kv, 'pay_9')).toBe('order_ghost');
  });
});

describe('validateOrderBody', () => {
  it('normalises Indian mobile numbers', () => {
    for (const p of ['9876543210', '+919876543210', '09876543210', '98765 43210', '+91-98765-43210', '919876543210']) {
      expect(normalisePhone(p)).toBe('+919876543210');
    }
    for (const p of ['1234567890', '5876543210', '987654321', '98765432100', '+449876543210', '91987654321', '9198765432100', '']) {
      expect(normalisePhone(p)).toBeNull();
    }
  });

  it('accepts a valid GSTIN (case-insensitively) and rejects malformed ones', () => {
    const good = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, gstin: '27aapfu0939f1zv' } });
    expect(good.ok && good.value.customer.gstin).toBe('27AAPFU0939F1ZV');
    for (const gstin of ['27AAPFU0939F1Z', '27AAPFU0939F0ZV', '27AAPFU0939F1XV', 'AAAAPFU0939F1ZV', '27AAPFU0939F1ZV1']) {
      const r = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, gstin } });
      expect(r).toMatchObject({ ok: false, fields: ['customer.gstin'] });
    }
  });

  it('enforces name, company and page lengths and rejects control characters', () => {
    const bad = validateOrderBody({
      tierId: 'websites-launch',
      customer: { ...customer, name: 'A', company: 'x'.repeat(121) },
      page: 'p'.repeat(201),
    });
    expect(bad).toMatchObject({ ok: false });
    expect(!bad.ok && bad.fields.sort()).toEqual(['customer.company', 'customer.name', 'page']);
    const crlf = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, name: 'Asha\r\nBcc: x@y.z' } });
    expect(crlf).toMatchObject({ ok: false, fields: ['customer.name'] });
  });

  it('rejects bidi overrides and zero-width characters in text fields', () => {
    for (const ch of ['\u200b', '\u200f', '\u202a', '\u202e', '\u2066', '\u2069', '\u2060', '\u061c', '\u00ad', '\ufeff']) {
      const r = validateOrderBody({
        tierId: 'websites-launch',
        customer: { ...customer, name: `Asha${ch}Rao`, company: `Rao${ch}Textiles` },
        page: `/serv${ch}ices`,
      });
      expect(r).toMatchObject({ ok: false });
      expect(!r.ok && r.fields.sort()).toEqual(['customer.company', 'customer.name', 'page']);
      const e = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, email: `asha${ch}@example.com` } });
      expect(e).toMatchObject({ ok: false, fields: ['customer.email'] });
    }
  });

  it('anchors the email pattern at both ends and limits the local part', () => {
    for (const email of [
      '<asha@example.com',
      '"Asha" <asha@example.com>',
      'asha@example.com@evil.com',
      'as(ha)@example.com',
      'asha!@example.com',
    ]) {
      const r = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, email } });
      expect(r, email).toMatchObject({ ok: false, fields: ['customer.email'] });
    }
    for (const email of ['asha.rao+orders@example.co.in', 'A_S%H-A@example.com']) {
      expect(validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, email } }).ok, email).toBe(true);
    }
  });

  it('treats empty optional fields as absent', () => {
    const r = validateOrderBody({ tierId: 'websites-launch', customer: { ...customer, company: '', gstin: '  ' } });
    expect(r.ok).toBe(true);
    expect(r.ok && 'company' in r.value.customer).toBe(false);
    expect(r.ok && 'gstin' in r.value.customer).toBe(false);
  });
});

describe('POST /orders', () => {
  let kv: FakeKV;
  let env: Env;
  let fetchMock: ReturnType<typeof vi.fn>;

  const post = (body: unknown, raw?: string) =>
    worker.fetch(
      new Request('https://api.test/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://techpravaha.com' },
        body: raw ?? JSON.stringify(body),
      }),
      env,
      ctx,
    );

  beforeEach(() => {
    kv = fakeKV();
    env = {
      ALLOWED_ORIGINS: 'https://techpravaha.com',
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'shh_secret',
      ORDERS: kv as unknown as KVNamespace,
    } as unknown as Env;
    fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const sent = JSON.parse(String(init!.body)) as { amount: number; receipt: string };
      return new Response(
        JSON.stringify({ id: 'order_x', amount: sent.amount, currency: 'INR', receipt: sent.receipt, status: 'created' }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('happy path: amount comes from the catalogue, order stored, keyId returned', async () => {
    const res = await post({ tierId: 'websites-launch', customer, page: '/services/websites' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://techpravaha.com');
    expect(await res.json()).toEqual({
      orderId: 'order_x',
      amount: 4130000,
      currency: 'INR',
      keyId: 'rzp_test_key',
      tier: { label: 'Launch' },
      service: { name: 'Websites & landing pages' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://api.razorpay.com/v1/orders');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Basic ${btoa('rzp_test_key:shh_secret')}`);
    const sent = JSON.parse(String(init.body));
    expect(sent.amount).toBe(4130000);
    expect(sent.currency).toBe('INR');
    expect(sent.receipt).toMatch(/^tp_websites-launch_[0-9a-z]+$/);
    expect(sent.receipt.length).toBeLessThanOrEqual(40);
    expect(sent.notes).toEqual({
      tierId: 'websites-launch',
      service: 'Websites & landing pages',
      tier: 'Launch',
    });
    expect(String(init.body)).not.toContain('asha@example.com');

    const stored = await getOrder(kv, 'order_x');
    expect(stored).toMatchObject({
      id: 'order_x',
      tierId: 'websites-launch',
      serviceName: 'Websites & landing pages',
      tierLabel: 'Launch',
      amountPaise: 4130000,
      customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210' },
      status: 'created',
      page: '/services/websites',
      gst: 0.18,
      totalPaise: 4130000,
      depositPct: 100,
    });
    expect(new Date(stored!.createdAt).toISOString()).toBe(stored!.createdAt);
    expect(kv.ttls.get('order:order_x')).toBe(7 * 24 * 3600);
  });

  it('a Growth tier creates a Razorpay order for the 50% deposit and stores the full total', async () => {
    const res = await post({ tierId: 'websites-growth', customer });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { amount: number }).amount).toBe(5605000);
    const [, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(JSON.parse(String(init.body)).amount).toBe(5605000);
    expect(await getOrder(kv, 'order_x')).toMatchObject({ amountPaise: 5605000, totalPaise: 11210000, depositPct: 50 });
  });

  it('every receipt fits in 40 chars for every buyable tier', async () => {
    for (const tierId of ['websites-growth', 'whatsapp-growth', 'content-growth', 'design-launch']) {
      const res = await post({ tierId, customer });
      expect(res.status).toBe(200);
    }
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(JSON.parse(String(init.body)).receipt.length).toBeLessThanOrEqual(40);
    }
  });

  it('a quote-only tier is refused and no order is created', async () => {
    const res = await post({ tierId: 'apps-growth', customer });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'quote-only or unknown tier' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(kv.map.size).toBe(0);
  });

  it('an unknown tier is refused', async () => {
    const res = await post({ tierId: 'nope', customer });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'quote-only or unknown tier' });
  });

  it('an amount field in the body is refused and no order is created', async () => {
    const res = await post({ tierId: 'websites-launch', customer, amount: 100 });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'unexpected field', fields: ['amount'] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(kv.map.size).toBe(0);
  });

  it('unexpected keys inside customer are refused too', async () => {
    const res = await post({ tierId: 'websites-launch', customer: { ...customer, amountPaise: 1 } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'unexpected field', fields: ['customer.amountPaise'] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('invalid email and phone are refused with field names', async () => {
    const res = await post({ tierId: 'websites-launch', customer: { ...customer, email: 'nope', phone: '1234567890' } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; fields: string[] };
    expect(body.error).toBe('invalid fields');
    expect(body.fields.sort()).toEqual(['customer.email', 'customer.phone']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('missing customer, non-string tierId and non-object bodies are refused', async () => {
    expect((await post({ tierId: 'websites-launch' })).status).toBe(400);
    const r = await post({ tierId: 42, customer });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid fields', fields: ['tierId'] });
    for (const body of [null, [], 'x', 7]) {
      expect((await post(body)).status).toBe(400);
    }
    expect((await post(undefined, '{not json')).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a __proto__ key on an otherwise valid body is refused as an unexpected field', async () => {
    const raw = `{"tierId":"websites-launch","customer":${JSON.stringify(customer)},"__proto__":{"amount":1}}`;
    const res = await post(undefined, raw);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'unexpected field', fields: ['__proto__'] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(kv.map.size).toBe(0);
  });

  it('a declared Content-Length over 8 KiB is refused with 413 before reading', async () => {
    const res = await worker.fetch(
      new Request('https://api.test/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '100000' },
        body: JSON.stringify({ tierId: 'websites-launch', customer }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'body too large' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a streamed body over 8 KiB with no Content-Length is cut off by the capped reader', async () => {
    const big = new TextEncoder().encode(JSON.stringify({ tierId: 'websites-launch', customer, page: 'x'.repeat(20_000) }));
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (pulled >= big.length) return c.close();
        c.enqueue(big.subarray(pulled, pulled + 1024));
        pulled += 1024;
      },
    });
    const req = new Request('https://api.test/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect(req.headers.get('Content-Length')).toBeNull();
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'body too large' });
    expect(pulled).toBeLessThan(big.length); // stopped reading early
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('an oversized body without a Content-Length is cut off by the capped reader', async () => {
    const res = await post(undefined, JSON.stringify({ tierId: 'websites-launch', customer, page: 'x'.repeat(20_000) }));
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upstream 500 becomes a 502 without leaking the provider body', async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":{"description":"internal provider detail"}}', { status: 500 }));
    const res = await post({ tierId: 'websites-launch', customer });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'payment provider error' });
    expect(text).not.toContain('internal provider detail');
    expect(kv.map.size).toBe(0);
  });

  it('upstream timeout becomes a 502', async () => {
    fetchMock.mockImplementation(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    const res = await post({ tierId: 'websites-launch', customer });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'payment provider error' });
    expect(kv.map.size).toBe(0);
  });
});
