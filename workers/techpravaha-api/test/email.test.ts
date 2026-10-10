import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml, receiptContent, sendAlert, sendReceipt } from '../src/email';
import type { Env } from '../src/env';
import type { OrderRecord } from '../src/orders';
import { appendOrderRow, escapeCell, orderRow } from '../src/sheets';

const order: OrderRecord = {
  id: 'order_ABCDEFGHIJ1234',
  tierId: 'websites-launch',
  serviceName: 'Websites & landing pages',
  tierLabel: 'Launch',
  amountPaise: 4130000,
  gst: 0.18,
  customer: {
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+919876543210',
    company: 'Rao Textiles',
    gstin: '27AAPFU0939F1ZV',
  },
  status: 'paid',
  paymentId: 'pay_PQRSTUVWXY5678',
  createdAt: '2026-10-10T00:00:00.000Z',
  paidAt: '2026-10-10T01:02:03.000Z',
  page: '/services/websites',
};

const baseEnv = {
  RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'Tech Pravaha <hello@techpravaha.com>',
  ALERT_EMAIL: 'alerts@example.com',
  SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/TEST/exec',
  SHEETS_WEBHOOK_TOKEN: 'sheet_tok',
} as unknown as Env;

const okJson = (body: unknown = { id: 'em_1' }) => new Response(JSON.stringify(body), { status: 200 });
const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response> = async () => okJson()) =>
  vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => impl(String(url), init!));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});

describe('sendReceipt', () => {
  it('POSTs to Resend with bearer auth, from, to, reply_to and the subject', async () => {
    const f = mockFetch();
    await sendReceipt(baseEnv, order, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const h = new Headers(init.headers);
    expect(h.get('Authorization')).toBe('Bearer re_test');
    expect(h.get('Content-Type')).toBe('application/json');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      from: 'Tech Pravaha <hello@techpravaha.com>',
      to: 'asha@example.com',
      reply_to: 'hello@techpravaha.com',
      subject: 'Your Tech Pravaha order order_ABCDEFGHIJ1234',
    });
    expect(typeof body.text).toBe('string');
    expect(typeof body.html).toBe('string');
  });

  it('text carries the summary, intake link, kickoff fallback and GST invoice note', () => {
    const { text } = receiptContent(baseEnv, order);
    expect(text).toContain('Asha Rao');
    expect(text).toContain('Websites & landing pages');
    expect(text).toContain('Launch');
    expect(text).toContain('₹35,000');
    expect(text).toContain('₹6,300');
    expect(text).toContain('₹41,300');
    expect(text).toContain('pay_PQRSTUVWXY5678');
    expect(text).toContain('https://techpravaha.com/contact/?order=order_ABCDEFGHIJ1234&tier=websites-launch');
    expect(text).toContain('We will send you a kickoff slot within one working day');
    expect(text).toContain('A GST invoice follows within one working day');
    expect(text).toContain('Yogesh, Tech Pravaha');
    expect(text).not.toContain('wa.me');
  });

  it('a full-payment order says "Total paid" and no deposit or balance', () => {
    const { text } = receiptContent(baseEnv, order);
    expect(text).toContain('Total paid: ₹41,300');
    expect(text).not.toContain('Deposit');
    expect(text).not.toContain('Balance');
  });

  it('a deposit order lists the total, the deposit paid and the balance due at launch', () => {
    const growth: OrderRecord = {
      ...order,
      tierId: 'websites-growth',
      tierLabel: 'Growth',
      amountPaise: 5605000,
      totalPaise: 11210000,
      depositPct: 50,
    };
    const { text, html } = receiptContent(baseEnv, growth);
    expect(text).toContain('Price: ₹95,000');
    expect(text).toContain('GST (18%): ₹17,100');
    expect(text).toContain('Total: ₹1,12,100');
    expect(text).toContain('Deposit paid (50%): ₹56,050');
    expect(text).toContain('Balance due at launch: ₹56,050');
    expect(text).not.toContain('Total paid');
    expect(html).toContain('Balance due at launch');
    expect(html).toContain('Deposit paid (50%)');
  });

  it('links the booking page and WhatsApp when configured', () => {
    const env = { ...baseEnv, BOOKING_URL: 'https://calendar.app.google/abc', WHATSAPP_NUMBER: '+91 98765 43210' };
    const { text, html } = receiptContent(env, order);
    expect(text).toContain('https://calendar.app.google/abc');
    expect(text).not.toContain('We will send you a kickoff slot');
    expect(text).toContain('https://wa.me/919876543210');
    expect(html).toContain('href="https://calendar.app.google/abc"');
    expect(html).toContain('href="https://wa.me/919876543210"');
  });

  it('ignores a non-https booking URL and a placeholder WhatsApp number', () => {
    const env = { ...baseEnv, BOOKING_URL: 'javascript:alert(1)', WHATSAPP_NUMBER: '91XXXXXXXXXX' };
    const { text, html } = receiptContent(env, order);
    expect(text).toContain('We will send you a kickoff slot within one working day');
    expect(html).not.toContain('javascript:');
    expect(text).not.toContain('wa.me');
  });

  it('contains no em-dashes or en-dashes in text or HTML', () => {
    const env = { ...baseEnv, BOOKING_URL: 'https://calendar.app.google/abc', WHATSAPP_NUMBER: '919876543210' };
    for (const e of [baseEnv, env]) {
      const { text, html, subject } = receiptContent(e, order);
      for (const s of [text, html, subject]) expect(s).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('escapes every user string in the HTML', () => {
    const hostile: OrderRecord = {
      ...order,
      customer: { ...order.customer, name: '<script>alert(1)</script>', company: '"><img src=x>' },
      serviceName: 'A & B',
    };
    const { html } = receiptContent(baseEnv, hostile);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('/contact/?order=order_ABCDEFGHIJ1234&amp;tier=websites-launch');
  });

  it('a non-2xx throws with the status only, never the Resend body', async () => {
    const f = mockFetch(async () => new Response('{"message":"bad address asha@example.com"}', { status: 422 }));
    const err = await sendReceipt(baseEnv, order, f as unknown as typeof fetch).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('422');
    expect((err as Error).message).not.toContain('asha@example.com');
  });

  it('a timeout throws', async () => {
    const f = mockFetch(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    await expect(sendReceipt(baseEnv, order, f as unknown as typeof fetch)).rejects.toThrow();
  });

  it('throws without calling Resend when the API key is missing', async () => {
    const f = mockFetch();
    await expect(
      sendReceipt({ ...baseEnv, RESEND_API_KEY: '' }, order, f as unknown as typeof fetch),
    ).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
});

describe('sendAlert', () => {
  it('sends a plain-text email to ALERT_EMAIL', async () => {
    const f = mockFetch();
    await sendAlert(baseEnv, 'Order x: sheet append failed', 'details', f as unknown as typeof fetch);
    const body = JSON.parse(String((f.mock.calls[0]![1] as RequestInit).body));
    expect(body).toMatchObject({
      from: 'Tech Pravaha <hello@techpravaha.com>',
      to: 'alerts@example.com',
      subject: 'Order x: sheet append failed',
      text: 'details',
    });
  });

  it('a non-2xx throws', async () => {
    const f = mockFetch(async () => new Response('nope', { status: 500 }));
    await expect(sendAlert(baseEnv, 's', 'b', f as unknown as typeof fetch)).rejects.toThrow(/500/);
  });
});

describe('Sheet append', () => {
  it('escapeCell prefixes formula triggers and leaves other values alone', () => {
    for (const s of ['=1+1', '+91', '-2', '@SUM(A1)', '\tx', '\rx']) expect(escapeCell(s)).toBe(`'${s}`);
    expect(escapeCell('Asha')).toBe('Asha');
    expect(escapeCell("'already")).toBe("'already");
    expect(escapeCell(35000)).toBe(35000);
    expect(escapeCell('')).toBe('');
  });

  it('splits price and GST with the rate stored on the order, not the catalogue', () => {
    // 12% stored rate: total 39200 = round(35000 * 1.12); the catalogue says 18%.
    const row = orderRow({ ...order, amountPaise: 3920000, gst: 0.12 });
    expect(row.slice(5, 8)).toEqual([35000, 4200, 39200]);
    const { text } = receiptContent(baseEnv, { ...order, amountPaise: 3920000, gst: 0.12 });
    expect(text).toContain('GST (12%): ₹4,200');
  });

  it('builds the row in the agreed column order', () => {
    expect(orderRow(order)).toEqual([
      '2026-10-10T01:02:03.000Z',
      'order_ABCDEFGHIJ1234',
      'pay_PQRSTUVWXY5678',
      'Websites & landing pages',
      'Launch',
      35000,
      6300,
      41300,
      'Asha Rao',
      'asha@example.com',
      "'+919876543210",
      'Rao Textiles',
      '27AAPFU0939F1ZV',
      '/services/websites',
      'paid',
      41300,
      0,
    ]);
    const bare: OrderRecord = { ...order, customer: { name: 'A B', email: 'a@b.co', phone: '+919876543210' } };
    delete bare.page;
    const row = orderRow(bare);
    expect(row).toHaveLength(17);
    expect(row.slice(11, 14)).toEqual(['', '', '']);
  });

  it('a deposit order shows the full price split, then the deposit and the balance due at launch', () => {
    const growth: OrderRecord = {
      ...order,
      tierId: 'websites-growth',
      tierLabel: 'Growth',
      amountPaise: 5605000,
      totalPaise: 11210000,
      depositPct: 50,
    };
    const row = orderRow(growth);
    expect(row.slice(5, 8)).toEqual([95000, 17100, 112100]);
    expect(row.slice(15)).toEqual([56050, 56050]);
  });

  it('POSTs { token, type, row } with redirects followed and a timeout', async () => {
    const f = mockFetch(async () => okJson({ ok: true }));
    await appendOrderRow(baseEnv, order, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://script.google.com/macros/s/TEST/exec');
    expect(init.method).toBe('POST');
    expect(init.redirect ?? 'follow').toBe('follow');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({ token: 'sheet_tok', type: 'order', row: orderRow(order) });
  });

  it('throws on a non-2xx, a { ok:false } reply (wrong token) or a non-JSON page', async () => {
    for (const res of [
      () => new Response('err', { status: 500 }),
      () => okJson({ ok: false }),
      () => new Response('<html>Sign in</html>', { status: 200 }),
    ]) {
      const f = mockFetch(async () => res());
      await expect(appendOrderRow(baseEnv, order, f as unknown as typeof fetch)).rejects.toThrow();
    }
  });
});
