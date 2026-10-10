import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { getOrder, getPaymentOrderId, putOrder, type OrderRecord } from '../src/orders';
import { fakeKV, type FakeKV } from './helpers/fake-kv';

const SECRET = 'whsec_test_123';
const ORDER_ID = 'order_ABCDEFGHIJ1234';
const PAY_ID = 'pay_PQRSTUVWXY5678';
const SHEET_URL = 'https://script.google.com/macros/s/TEST/exec';
const ALERT_TO = 'alerts@example.com';
const CUSTOMER_EMAIL = 'asha@example.com';

const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');

function record(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: ORDER_ID,
    tierId: 'websites-launch',
    serviceName: 'Websites & landing pages',
    tierLabel: 'Launch',
    amountPaise: 4130000,
    gst: 0.18,
    customer: { name: 'Asha Rao', email: CUSTOMER_EMAIL, phone: '+919876543210', company: 'Rao Textiles' },
    status: 'created',
    createdAt: '2026-10-10T00:00:00.000Z',
    page: '/services/websites',
    ...over,
  };
}

function event(name: string, entity: Record<string, unknown> = {}): string {
  return JSON.stringify({
    entity: 'event',
    account_id: 'acc_test',
    event: name,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: PAY_ID,
          entity: 'payment',
          amount: 4130000,
          currency: 'INR',
          status: 'captured',
          order_id: ORDER_ID,
          method: 'upi',
          email: CUSTOMER_EMAIL,
          contact: '+919876543210',
          ...entity,
        },
      },
    },
    created_at: 1760000000,
  });
}

type Sent = { url: string; body: Record<string, unknown> };

describe('POST /webhooks/razorpay', () => {
  let kv: FakeKV;
  let env: Env;
  let pending: Promise<unknown>[];
  let ctx: ExecutionContext;
  let sent: Sent[];
  let sheetResponse: () => Promise<Response>;
  let resendResponse: (to: string) => Promise<Response>;
  let errors: unknown[][];

  const sheetCalls = () => sent.filter((s) => s.url === SHEET_URL);
  const receipts = () => sent.filter((s) => s.url === 'https://api.resend.com/emails' && s.body.to === CUSTOMER_EMAIL);
  const alerts = () => sent.filter((s) => s.url === 'https://api.resend.com/emails' && s.body.to === ALERT_TO);

  async function deliver(raw: string, signature: string | null = sign(raw)): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Razorpay-Event-Id': 'evt_123' };
    if (signature !== null) headers['X-Razorpay-Signature'] = signature;
    const res = await worker.fetch(
      new Request('https://api.test/webhooks/razorpay', { method: 'POST', headers, body: raw }),
      env,
      ctx,
    );
    await Promise.all(pending);
    return res;
  }

  beforeEach(() => {
    kv = fakeKV();
    env = {
      ALLOWED_ORIGINS: 'https://techpravaha.com',
      RAZORPAY_WEBHOOK_SECRET: SECRET,
      RESEND_API_KEY: 're_test',
      SHEETS_WEBHOOK_URL: SHEET_URL,
      SHEETS_WEBHOOK_TOKEN: 'sheet_tok',
      ALERT_EMAIL: ALERT_TO,
      FROM_EMAIL: 'Tech Pravaha <hello@techpravaha.com>',
      ORDERS: kv as unknown as KVNamespace,
    } as unknown as Env;
    pending = [];
    ctx = {
      waitUntil: (p: Promise<unknown>) => void pending.push(p),
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;
    sent = [];
    sheetResponse = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    resendResponse = async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        const u = String(url);
        const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
        sent.push({ url: u, body });
        if (u === SHEET_URL) return sheetResponse();
        if (u === 'https://api.resend.com/emails') return resendResponse(String(body.to));
        throw new Error(`unexpected fetch ${u}`);
      }),
    );
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void errors.push(args));
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => void errors.push(args));
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => void errors.push(args));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('bad signature: 400, no KV change, no fetch, nothing sensitive logged', async () => {
    await putOrder(kv, record());
    const writes = kv.puts.length;
    const raw = event('payment.captured');
    const res = await deliver(raw, sign(raw + 'x'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad signature' });
    expect(kv.puts.length).toBe(writes);
    expect(sent).toEqual([]);
    const logged = JSON.stringify(errors);
    expect(logged).not.toContain(CUSTOMER_EMAIL);
    expect(logged).not.toContain(PAY_ID);
    expect(logged).toContain('evt_123');
  });

  it('missing signature: 400, no side effects', async () => {
    await putOrder(kv, record());
    const res = await deliver(event('payment.captured'), null);
    expect(res.status).toBe(400);
    expect((await getOrder(kv, ORDER_ID))!.status).toBe('created');
    expect(sent).toEqual([]);
  });

  it('payment.captured for a created order: marks paid, one Sheet POST and one receipt', async () => {
    await putOrder(kv, record());
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const o = await getOrder(kv, ORDER_ID);
    expect(o).toMatchObject({ status: 'paid', paymentId: PAY_ID });
    expect(kv.ttls.get(`order:${ORDER_ID}`)).toBeUndefined(); // paid record never expires
    expect(await getPaymentOrderId(kv, PAY_ID)).toBe(ORDER_ID);

    expect(sheetCalls()).toHaveLength(1);
    const sheet = sheetCalls()[0]!.body as { token: string; row: unknown[] };
    expect(sheet.token).toBe('sheet_tok');
    expect(sheet.row.slice(1, 3)).toEqual([ORDER_ID, PAY_ID]);
    expect(receipts()).toHaveLength(1);
    expect(receipts()[0]!.body.subject).toBe(`Your Tech Pravaha order ${ORDER_ID}`);
    expect(alerts()).toHaveLength(0);
  });

  it('replay of the same payload: 200 duplicate, no second Sheet or Resend call, no KV writes', async () => {
    await putOrder(kv, record());
    const raw = event('payment.captured');
    await deliver(raw);
    const writes = kv.puts.length;
    const calls = sent.length;

    const res = await deliver(raw);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(sent.length).toBe(calls);
    expect(kv.puts.length).toBe(writes);
  });

  it('payment index already present while the order still reads created (stale KV / race): no side effects', async () => {
    await putOrder(kv, record());
    await kv.put(`payment:${PAY_ID}`, JSON.stringify(ORDER_ID));
    const writes = kv.puts.length;
    const res = await deliver(event('payment.captured'));
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(kv.puts.length).toBe(writes);
    expect(sent).toEqual([]);
  });

  it('already-paid order with no payment index (same payment, e.g. a retry after a half-written 500): no Sheet or receipt, one check alert', async () => {
    await putOrder(kv, record({ status: 'paid', paymentId: PAY_ID, paidAt: '2026-10-10T01:00:00.000Z' }));
    const res = await deliver(event('payment.captured'));
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(sheetCalls()).toHaveLength(0);
    expect(receipts()).toHaveLength(0);
    expect(alerts().map((a) => a.body.subject)).toEqual([`Order ${ORDER_ID}: check receipt and Sheet row`]);
  });

  it('a second, different captured payment on an already-paid order alerts (refund likely needed)', async () => {
    await putOrder(kv, record({ status: 'paid', paymentId: 'pay_FIRST00000001', paidAt: '2026-10-10T01:00:00.000Z' }));
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(sheetCalls()).toHaveLength(0);
    expect(receipts()).toHaveLength(0);
    expect(alerts()).toHaveLength(1);
    const text = String(alerts()[0]!.body.text);
    expect(text).toContain('pay_FIRST00000001');
    expect(text).toContain(PAY_ID);
  });

  it('Sheet POST fails: still 200, order paid, receipt still sent, alert sent without PII', async () => {
    await putOrder(kv, record());
    sheetResponse = async () => new Response('<html>Google error page with secrets</html>', { status: 500 });
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect((await getOrder(kv, ORDER_ID))!.status).toBe('paid');
    expect(receipts()).toHaveLength(1);
    expect(alerts()).toHaveLength(1);
    const alert = alerts()[0]!.body;
    expect(alert.subject).toBe(`Order ${ORDER_ID}: sheet append failed`);
    const text = String(alert.text);
    expect(text).toContain('500');
    for (const pii of [CUSTOMER_EMAIL, 'Asha', '9876543210', 'Rao Textiles', 'Google error page']) {
      expect(text).not.toContain(pii);
    }
  });

  it('Sheet times out and the receipt fails: both are alerted, the webhook still answers 200', async () => {
    await putOrder(kv, record());
    sheetResponse = async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    };
    resendResponse = async (to) =>
      to === CUSTOMER_EMAIL
        ? new Response('{"message":"invalid to asha@example.com"}', { status: 422 })
        : new Response('{"id":"em_2"}', { status: 200 });
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(alerts().map((a) => a.body.subject).sort()).toEqual([
      `Order ${ORDER_ID}: receipt email failed`,
      `Order ${ORDER_ID}: sheet append failed`,
    ]);
    const text = JSON.stringify(alerts().map((a) => a.body.text));
    expect(text).toContain('TimeoutError');
    expect(text).toContain('422');
    expect(text).not.toContain(CUSTOMER_EMAIL);
  });

  it('when the alert itself fails it is logged and nothing throws', async () => {
    await putOrder(kv, record());
    sheetResponse = async () => new Response('', { status: 500 });
    resendResponse = async (to) =>
      to === ALERT_TO ? new Response('', { status: 503 }) : new Response('{"id":"em_1"}', { status: 200 });
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(alerts()).toHaveLength(1);
    expect(JSON.stringify(errors)).toContain('alert failed');
  });

  it('unknown order id: 200 unknown + alert, no Sheet or receipt', async () => {
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, unknown: true });
    expect(sheetCalls()).toHaveLength(0);
    expect(receipts()).toHaveLength(0);
    expect(alerts()).toHaveLength(1);
    const a = alerts()[0]!.body;
    expect(String(a.subject)).toContain(ORDER_ID);
    expect(String(a.text)).toContain(PAY_ID);
    expect(String(a.text)).not.toContain(CUSTOMER_EMAIL);
    expect(await getPaymentOrderId(kv, PAY_ID)).toBe(ORDER_ID);
  });

  it('amount mismatch: still marked paid, alert carries both numbers', async () => {
    await putOrder(kv, record());
    const res = await deliver(event('payment.captured', { amount: 100 }));
    expect(res.status).toBe(200);
    expect((await getOrder(kv, ORDER_ID))!.status).toBe('paid');
    const mismatch = alerts().filter((a) => String(a.body.subject).includes('amount mismatch'));
    expect(mismatch).toHaveLength(1);
    expect(String(mismatch[0]!.body.text)).toContain('100');
    expect(String(mismatch[0]!.body.text)).toContain('4130000');
  });

  it('other events are acknowledged and ignored with no KV writes', async () => {
    await putOrder(kv, record());
    const writes = kv.puts.length;
    const res = await deliver(event('payment.failed'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ignored: 'payment.failed' });
    expect(kv.puts.length).toBe(writes);
    expect(sent).toEqual([]);
  });

  it('signed but unparseable or malformed payloads are acknowledged with 200', async () => {
    const garbage = '{not json';
    const r1 = await deliver(garbage);
    expect(r1.status).toBe(200);
    const noIds = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { amount: 1 } } } });
    const r2 = await deliver(noIds);
    expect(r2.status).toBe(200);
    expect(kv.puts).toEqual([]);
  });

  it('a KV outage before anything is recorded returns 500 so Razorpay retries', async () => {
    env.ORDERS = {
      get: async () => {
        throw new Error('kv down');
      },
      put: async () => {
        throw new Error('kv down');
      },
    } as unknown as KVNamespace;
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(500);
    expect(sent.filter((s) => s.body.to === CUSTOMER_EMAIL)).toHaveLength(0);
    expect(alerts().map((a) => a.body.subject)).toEqual([`Order ${ORDER_ID}: store error, Razorpay will retry`]);
  });

  it('a KV read failing after markPaid cannot drop the order silently: side effects still run', async () => {
    await putOrder(kv, record());
    // Fail every order: read after the first one (the read markPaid does).
    let orderReads = 0;
    const realGet = kv.get.bind(kv);
    kv.get = async (key: string, opts?: { type?: 'json' | 'text' }) => {
      if (key.startsWith('order:') && ++orderReads > 1) throw new Error('kv read failed');
      return realGet(key, opts);
    };
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect((await realGet(`order:${ORDER_ID}`, { type: 'json' }) as OrderRecord).status).toBe('paid');
    expect(sheetCalls().length + receipts().length + alerts().length).toBeGreaterThan(0);
    expect(sheetCalls()).toHaveLength(1);
    expect(receipts()).toHaveLength(1);
  });

  it('a KV failure after the payment index is written alerts and answers 200 (a retry would be deduplicated)', async () => {
    await putOrder(kv, record());
    const realPut = kv.put.bind(kv);
    // The payment index write lands but then reports failure (e.g. a timeout after commit).
    kv.put = async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      await realPut(key, value, opts);
      if (key.startsWith('payment:')) throw new Error('kv put timed out');
    };
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(200);
    expect(sheetCalls()).toHaveLength(0);
    expect(receipts()).toHaveLength(0);
    expect(alerts().map((a) => a.body.subject)).toEqual([`Order ${ORDER_ID}: paid, side effects not run`]);
    expect(String(alerts()[0]!.body.text)).not.toContain(CUSTOMER_EMAIL);
  });

  it('a KV failure before the payment index is written answers 500 with a precautionary alert (retry recovers)', async () => {
    await putOrder(kv, record());
    const realPut = kv.put.bind(kv);
    kv.put = async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      if (key.startsWith('payment:')) throw new Error('kv put failed');
      return realPut(key, value, opts);
    };
    const res = await deliver(event('payment.captured'));
    expect(res.status).toBe(500);
    // Nothing is indexed, so the retry will run the side effects: the alert says so and asks for no manual work yet.
    expect(alerts().map((a) => a.body.subject)).toEqual([`Order ${ORDER_ID}: store error, Razorpay will retry`]);
    expect(String(alerts()[0]!.body.text)).toContain('act only if no Sheet row or receipt appears');
    expect(sheetCalls()).toHaveLength(0);
    expect(receipts()).toHaveLength(0);

    // Razorpay retries once KV is healthy: the order reads paid but unindexed, so the check alert fires.
    kv.put = realPut;
    const retry = await deliver(event('payment.captured'));
    expect(await retry.json()).toEqual({ ok: true, duplicate: true });
    expect(alerts().map((a) => a.body.subject)).toEqual([
      `Order ${ORDER_ID}: store error, Razorpay will retry`,
      `Order ${ORDER_ID}: check receipt and Sheet row`,
    ]);
  });

  it('verifies the signature over the exact bytes, not a re-encoding of the decoded text', async () => {
    await putOrder(kv, record());
    // Invalid UTF-8 (0xff) decodes to U+FFFD; a signature over the re-encoded text must not verify.
    const prefix = new TextEncoder().encode(event('payment.captured').slice(0, -1) + ',"x":"');
    const suffix = new TextEncoder().encode('"}');
    const bytes = new Uint8Array([...prefix, 0xff, ...suffix]);
    const reencoded = new TextEncoder().encode(new TextDecoder().decode(bytes));
    const sigOver = (b: Uint8Array) => createHmac('sha256', SECRET).update(Buffer.from(b)).digest('hex');
    const send = (sig: string) =>
      worker.fetch(
        new Request('https://api.test/webhooks/razorpay', {
          method: 'POST',
          headers: { 'X-Razorpay-Signature': sig },
          body: bytes,
        }),
        env,
        ctx,
      );
    expect((await send(sigOver(reencoded))).status).toBe(400);
    const ok = await send(sigOver(bytes));
    await Promise.all(pending);
    expect(ok.status).toBe(200);
    expect((await getOrder(kv, ORDER_ID))!.status).toBe('paid');
  });

  it('an oversized webhook body is refused before verification', async () => {
    const raw = event('payment.captured', { notes: { pad: 'x'.repeat(70_000) } });
    const res = await deliver(raw);
    expect(res.status).toBe(413);
    expect(kv.puts).toEqual([]);
  });

  it('hostile name and company are formula-escaped in the Sheet and HTML-escaped in the receipt', async () => {
    await putOrder(
      kv,
      record({
        customer: {
          name: '=HYPERLINK("https://evil.example","x")',
          email: CUSTOMER_EMAIL,
          phone: '+919876543210',
          company: '<img src=x onerror=alert(1)>',
        },
      }),
    );
    await deliver(event('payment.captured'));
    const row = (sheetCalls()[0]!.body as { row: unknown[] }).row;
    expect(row).toContain(`'=HYPERLINK("https://evil.example","x")`);
    expect(row).toContain("'+919876543210");
    const html = String(receipts()[0]!.body.html);
    expect(html).not.toContain('<img');
    expect(row).toContain('<img src=x onerror=alert(1)>'); // inert in a Sheet cell; the receipt omits company
    expect(html).toContain('=HYPERLINK(&quot;https://evil.example&quot;,&quot;x&quot;)');
  });
});

describe('GET /orders/:id/status', () => {
  let kv: FakeKV;
  let env: Env;
  const ctx = { waitUntil: () => {} } as unknown as ExecutionContext;
  const get = (path: string) =>
    worker.fetch(new Request(`https://api.test${path}`, { headers: { Origin: 'https://techpravaha.com' } }), env, ctx);

  beforeEach(() => {
    kv = fakeKV();
    env = { ALLOWED_ORIGINS: 'https://techpravaha.com', ORDERS: kv as unknown as KVNamespace } as unknown as Env;
  });

  it('reports created, then paid, with no customer data', async () => {
    await putOrder(kv, record());
    const r1 = await get(`/orders/${ORDER_ID}/status`);
    expect(r1.status).toBe(200);
    expect(r1.headers.get('Access-Control-Allow-Origin')).toBe('https://techpravaha.com');
    expect(await r1.json()).toEqual({
      status: 'created',
      tierId: 'websites-launch',
      tier: 'Launch',
      service: 'Websites & landing pages',
      amountPaise: 4130000,
      totalPaise: 4130000,
      depositPct: 100,
    });

    await putOrder(kv, record({ status: 'paid', paymentId: PAY_ID }));
    const r2 = await get(`/orders/${ORDER_ID}/status`);
    const text = await r2.text();
    expect(JSON.parse(text).status).toBe('paid');
    for (const leak of [CUSTOMER_EMAIL, 'Asha', '9876543210', PAY_ID, 'Rao Textiles', '/services/websites']) {
      expect(text).not.toContain(leak);
    }
  });

  it('reports the deposit split for a part-paid order', async () => {
    await putOrder(kv, record({ tierId: 'websites-growth', amountPaise: 5605000, totalPaise: 11210000, depositPct: 50 }));
    const body = await (await get(`/orders/${ORDER_ID}/status`)).json();
    expect(body).toMatchObject({ amountPaise: 5605000, totalPaise: 11210000, depositPct: 50 });
  });

  it('reads with a 30 s edge cache TTL so a paid write shows up sooner', async () => {
    await putOrder(kv, record());
    const spy = vi.spyOn(kv, 'get');
    await get(`/orders/${ORDER_ID}/status`);
    expect(spy).toHaveBeenCalledWith(`order:${ORDER_ID}`, { type: 'json', cacheTtl: 30 });
  });

  it('rejects malformed ids with 404 before touching KV', async () => {
    const spy = vi.spyOn(kv, 'get');
    for (const id of ['order_x', 'abc', 'order_ABC%2F..%2Fx', 'order_' + 'A'.repeat(21), 'payment_ABCDEFGHIJ', 'order_ABCDEFGHI-']) {
      const res = await get(`/orders/${id}/status`);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'not found' });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('unknown well-formed id is a 404', async () => {
    const res = await get('/orders/order_ZZZZZZZZZZ9999/status');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});
