import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';
import { fakeRateLimit, type FakeRateLimit } from './helpers/fake-ratelimit';

const SHEET_URL = 'https://script.google.com/macros/s/TEST/exec';
const TG = 'https://api.telegram.org/bot123:ABC/sendMessage';
const RESEND = 'https://api.resend.com/emails';

type Call = { url: string; body: Record<string, unknown> };

const lead = (over: Record<string, unknown> = {}) => ({
  type: 'contact',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '98765 43210',
  message: 'A site for my bakery.\nLaunch by December.',
  page: '/contact',
  tier: 'websites-launch',
  order: 'order_TEST1234567890',
  url: 'https://asha-bakery.example/',
  ...over,
});

describe('POST /leads', () => {
  let rl: FakeRateLimit;
  let env: Env;
  let calls: Call[];
  let pending: Promise<unknown>[];
  let sheetReply: () => Response;
  let logs: unknown[][];

  const ctx = {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;

  async function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
    const res = await worker.fetch(
      new Request('https://api.test/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://techpravaha.com',
          'CF-Connecting-IP': '203.0.113.7',
          ...headers,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
      env,
      ctx,
    );
    await Promise.all(pending);
    return res;
  }
  const sheetCalls = () => calls.filter((c) => c.url === SHEET_URL);
  const pings = () => calls.filter((c) => c.url === TG);
  const alerts = () => calls.filter((c) => c.url === RESEND);

  beforeEach(() => {
    rl = fakeRateLimit(6);
    env = {
      ALLOWED_ORIGINS: 'https://techpravaha.com',
      LEADS_RATE: rl as unknown as RateLimit,
      SHEETS_WEBHOOK_URL: SHEET_URL,
      SHEETS_WEBHOOK_TOKEN: 'sheet_tok',
      TELEGRAM_BOT_TOKEN: '123:ABC',
      TELEGRAM_CHAT_ID: '-100777',
      RESEND_API_KEY: 're_test',
      FROM_EMAIL: 'Tech Pravaha <hello@techpravaha.com>',
      ALERT_EMAIL: 'alerts@example.com',
    } as unknown as Env;
    calls = [];
    pending = [];
    sheetReply = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        const u = String(url);
        calls.push({ url: u, body: JSON.parse(String(init!.body)) as Record<string, unknown> });
        if (u === SHEET_URL) return sheetReply();
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );
    logs = [];
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation((...a: unknown[]) => void logs.push(a));
    }
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('happy path: 202, one Sheet row of type lead, one ping, with CORS', async () => {
    const res = await post(lead());
    expect(res.status).toBe(202);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://techpravaha.com');
    expect(await res.json()).toEqual({ ok: true });

    expect(sheetCalls()).toHaveLength(1);
    const sheet = sheetCalls()[0]!.body as { token: string; type: string; row: unknown[] };
    expect(sheet.token).toBe('sheet_tok');
    expect(sheet.type).toBe('lead');
    expect(sheet.row).toHaveLength(10);
    const [ts, type, name, email, phone, message, page, tier, order, url] = sheet.row;
    expect(Number.isNaN(Date.parse(String(ts)))).toBe(false);
    expect([type, name, email, phone, message, page, tier, order, url]).toEqual([
      'contact',
      'Asha Rao',
      'asha@example.com',
      "'+919876543210", // a leading + is formula-escaped, as in the Orders tab
      'A site for my bakery.\nLaunch by December.',
      '/contact',
      'websites-launch',
      'order_TEST1234567890',
      'https://asha-bakery.example/',
    ]);

    expect(pings()).toHaveLength(1);
    expect(pings()[0]!.body.text).toBe('New contact: Asha Rao asha@example.com · /contact · websites-launch');
    expect(alerts()).toHaveLength(0);
  });

  it('minimal lead_magnet: optional cells are blank and the ping has no tier', async () => {
    const res = await post({
      type: 'lead_magnet',
      name: 'Ravi',
      email: 'ravi@example.com',
      message: 'Teardown please',
      page: '/teardown',
      url: 'https://ravi.example',
    });
    expect(res.status).toBe(202);
    const row = (sheetCalls()[0]!.body as { row: unknown[] }).row;
    expect(row.slice(1)).toEqual([
      'lead_magnet',
      'Ravi',
      'ravi@example.com',
      '',
      'Teardown please',
      '/teardown',
      '',
      '',
      'https://ravi.example',
    ]);
    // The site URL rides in the ping, so a teardown lead survives a Sheet failure.
    expect(pings()[0]!.body.text).toBe('New lead_magnet: Ravi ravi@example.com · /teardown · https://ravi.example');
  });

  it('answers before the Sheet finishes (202 does not wait on the upstream)', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), body: JSON.parse(String(init!.body)) as Record<string, unknown> });
        if (String(url) === SHEET_URL) await gate;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );
    const res = await worker.fetch(
      new Request('https://api.test/leads', { method: 'POST', body: JSON.stringify(lead()) }),
      env,
      ctx,
    );
    expect(res.status).toBe(202);
    release();
    await Promise.all(pending);
    expect(pings()).toHaveLength(1);
  });

  it('formula-escapes cells that start with a formula character', async () => {
    await post(lead({ name: '=HYPERLINK("http://x")', message: '+1 call me', phone: undefined }));
    const row = (sheetCalls()[0]!.body as { row: unknown[] }).row;
    expect(row[2]).toBe('\'=HYPERLINK("http://x")');
    expect(row[5]).toBe("'+1 call me");
  });

  it.each([
    ['unknown top-level key', { extra: 1 }],
    ['__proto__-style key', JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>],
    ['bad email', { email: 'not-an-email' }],
    ['unknown tier id', { tier: 'websites-nope' }],
    ['tier with bad shape', { tier: '../etc' }],
    ['bad order id', { order: 'order_<b>' }],
    ['bad type', { type: 'order' }],
    ['missing type', { type: undefined }],
    ['empty message', { message: '   ' }],
    ['message over 2000 chars', { message: 'x'.repeat(2001) }],
    ['message with a control character', { message: 'hi\u0000there' }],
    ['message with a bidi override', { message: 'hi‮there' }],
    ['name with a newline', { name: 'Asha\nBcc: x@evil.example' }],
    ['page over 200 chars', { page: '/' + 'a'.repeat(200) }],
    ['missing page', { page: undefined }],
    ['non-string message', { message: { a: 1 } }],
    ['url without scheme', { url: 'javascript:alert(1)' }],
    ['url over 300 chars', { url: 'https://x.example/' + 'a'.repeat(300) }],
    ['url with whitespace', { url: 'https://x.example/a b' }],
    ['bad phone', { phone: 'abc' }],
  ])('400 on %s', async (_label, over) => {
    const res = await post({ ...lead(), ...over });
    expect(res.status).toBe(400);
    expect(sheetCalls()).toHaveLength(0);
    expect(pings()).toHaveLength(0);
  });

  it('400 names the offending fields, never their values', async () => {
    const res = await post(lead({ email: 'bad', tier: 'nope' }));
    const body = (await res.json()) as { error: string; fields: string[] };
    expect(body.error).toBe('invalid fields');
    expect(body.fields).toEqual(['email', 'tier']);
    const unknown = await post({ ...lead(), isAdmin: true });
    expect(await unknown.json()).toEqual({ error: 'unexpected field', fields: ['isAdmin'] });
  });

  it('400 on invalid json and on a non-object body; 413 over 16 KiB', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post('[1,2]')).status).toBe(400);
    expect((await post('null')).status).toBe(400);
    const big = await post(lead({ message: 'x'.repeat(17 * 1024) }));
    expect(big.status).toBe(413);
    expect(sheetCalls()).toHaveLength(0);
  });

  it('429 after 6 valid requests from one IP; another IP still passes', async () => {
    for (let i = 0; i < 6; i++) expect((await post(lead())).status).toBe(202);
    const res = await post(lead());
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'too many requests' });
    expect(sheetCalls()).toHaveLength(6);
    expect(new Set(rl.keys)).toEqual(new Set(['203.0.113.7']));
    expect((await post(lead(), { 'CF-Connecting-IP': '198.51.100.9' })).status).toBe(202);
  });

  it('invalid requests do not spend the quota', async () => {
    for (let i = 0; i < 10; i++) await post(lead({ email: 'bad' }));
    expect((await post(lead())).status).toBe(202);
  });

  it('Sheet failure: alert email without customer data, ping still sent, still 202', async () => {
    sheetReply = () => new Response('boom', { status: 500 });
    const res = await post(lead());
    expect(res.status).toBe(202);
    expect(pings()).toHaveLength(1);
    expect(alerts()).toHaveLength(1);
    const alert = alerts()[0]!.body;
    expect(String(alert.subject)).toContain('Lead sheet append failed');
    const blob = JSON.stringify(alert);
    for (const secret of ['Asha', 'asha@example.com', '9876543210', 'bakery']) expect(blob).not.toContain(secret);
  });

  it('without Telegram a lead sends no email ping; only a Sheet failure alert uses Resend', async () => {
    delete (env as { TELEGRAM_BOT_TOKEN?: string }).TELEGRAM_BOT_TOKEN;
    expect((await post(lead())).status).toBe(202);
    expect(sheetCalls()).toHaveLength(1);
    expect(pings()).toHaveLength(0);
    expect(alerts()).toHaveLength(0);

    sheetReply = () => new Response('boom', { status: 500 });
    expect((await post(lead())).status).toBe(202);
    expect(alerts()).toHaveLength(1);
    expect(String(alerts()[0]!.body.subject)).toContain('Lead sheet append failed');
    expect(String(alerts()[0]!.body.text)).toContain('ask the visitor again');
  });

  it('Sheet rejection ({ok:false}) is also an alert', async () => {
    sheetReply = () => new Response(JSON.stringify({ ok: false }), { status: 200 });
    expect((await post(lead())).status).toBe(202);
    expect(alerts()).toHaveLength(1);
  });

  it('no customer data in logs, on success or failure', async () => {
    await post(lead());
    sheetReply = () => new Response('boom', { status: 500 });
    await post(lead());
    await post(lead({ email: 'leaky@example.com' , tier: 'bad-tier'}));
    const blob = JSON.stringify(logs);
    for (const secret of ['Asha', 'asha@example.com', 'leaky@', '9876543210', 'bakery', '203.0.113.7', '123:ABC', 'sheet_tok']) {
      expect(blob).not.toContain(secret);
    }
  });
});
