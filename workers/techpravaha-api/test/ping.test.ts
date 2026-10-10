import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import type { OrderRecord } from '../src/orders';
import { ping } from '../src/ping';
import { afterPaid } from '../src/webhook';

const SHEET_URL = 'https://script.google.com/macros/s/TEST/exec';
const RESEND = 'https://api.resend.com/emails';
const TG = 'https://api.telegram.org/bot123:ABC/sendMessage';

type Call = { url: string; body: Record<string, unknown> };

function baseEnv(over: Partial<Env> = {}): Env {
  return {
    RESEND_API_KEY: 're_test',
    FROM_EMAIL: 'Tech Pravaha <hello@techpravaha.com>',
    ALERT_EMAIL: 'alerts@example.com',
    SHEETS_WEBHOOK_URL: SHEET_URL,
    SHEETS_WEBHOOK_TOKEN: 'tok',
    ...over,
  } as unknown as Env;
}

const telegramEnv = (over: Partial<Env> = {}) =>
  baseEnv({ TELEGRAM_BOT_TOKEN: '123:ABC', TELEGRAM_CHAT_ID: '-100777', ...over });

function order(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order_ABCDEFGHIJ1234',
    tierId: 'websites-growth',
    serviceName: 'Websites & landing pages',
    tierLabel: 'Growth',
    amountPaise: 5605000,
    totalPaise: 11210000,
    depositPct: 50,
    gst: 0.18,
    customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210' },
    status: 'paid',
    paymentId: 'pay_PQRSTUVWXY5678',
    createdAt: '2026-10-10T00:00:00.000Z',
    ...over,
  };
}

let calls: Call[];
let respond: (url: string) => Promise<Response>;
let logs: unknown[][];

beforeEach(() => {
  calls = [];
  respond = async () => new Response('{"ok":true}', { status: 200 });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, body: JSON.parse(String(init!.body)) as Record<string, unknown> });
      return respond(u);
    }),
  );
  logs = [];
  for (const level of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((...a: unknown[]) => void logs.push(a));
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ping', () => {
  it('uses Telegram sendMessage when the bot token and chat id are set', async () => {
    await ping(telegramEnv(), 'lead', 'New lead: Asha');
    expect(calls).toEqual([
      { url: TG, body: { chat_id: '-100777', text: 'New lead: Asha', disable_web_page_preview: true } },
    ]);
  });

  it('order pings fall back to the alert email when Telegram is not configured (either value missing)', async () => {
    await ping(baseEnv(), 'order', 'Order x paid');
    await ping(baseEnv({ TELEGRAM_BOT_TOKEN: '123:ABC' }), 'order', 'Order y paid');
    await ping(baseEnv({ TELEGRAM_CHAT_ID: '-100777' }), 'order', 'Order z paid');
    expect(calls.map((c) => c.url)).toEqual([RESEND, RESEND, RESEND]);
    expect(calls[0]!.body).toMatchObject({ to: 'alerts@example.com', subject: 'New order', text: 'Order x paid' });
  });

  it('lead pings are Telegram only: without Telegram nothing is sent and one info line is logged', async () => {
    const infos: unknown[][] = [];
    vi.spyOn(console, 'info').mockImplementation((...a: unknown[]) => void infos.push(a));
    await ping(baseEnv(), 'lead', 'SECRET-LEAD');
    await ping(baseEnv({ TELEGRAM_BOT_TOKEN: '123:ABC' }), 'lead', 'SECRET-LEAD');
    expect(calls).toHaveLength(0);
    expect(infos).toEqual([['lead ping skipped: Telegram not configured'], ['lead ping skipped: Telegram not configured']]);
    expect(logs).toHaveLength(0);
    expect(JSON.stringify(infos)).not.toContain('SECRET-LEAD');
  });

  it('uses the injected fetch', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    await ping(telegramEnv(), 'order', 'x', f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it('never throws: Telegram 500, network error and email failure are logged without the token or text', async () => {
    respond = async () => new Response('bad', { status: 500 });
    await expect(ping(telegramEnv(), 'order', 'SECRET-TEXT')).resolves.toBeUndefined();
    respond = async () => {
      throw new TypeError(`fetch failed for ${TG}`);
    };
    await expect(ping(telegramEnv(), 'order', 'SECRET-TEXT')).resolves.toBeUndefined();
    await expect(ping(baseEnv(), 'order', 'SECRET-TEXT')).resolves.toBeUndefined();
    await expect(ping(baseEnv({ ALERT_EMAIL: '' }), 'order', 'SECRET-TEXT')).resolves.toBeUndefined();
    expect(logs).toHaveLength(4);
    const logged = JSON.stringify(logs);
    expect(logged).not.toContain('123:ABC');
    expect(logged).not.toContain('SECRET-TEXT');
  });
});

describe('afterPaid pings', () => {
  it('pings after the Sheet row and the receipt, with order id, service, tier, amount charged and name', async () => {
    await afterPaid(telegramEnv(), order());
    expect(calls.map((c) => c.url)).toEqual([SHEET_URL, RESEND, TG]);
    expect(calls[2]!.body.text).toBe('Order order_ABCDEFGHIJ1234 paid: Websites & landing pages · Growth, ₹56,050 (Asha Rao)');
  });

  it('pings by email when Telegram is unset', async () => {
    await afterPaid(baseEnv(), order({ amountPaise: 4130000, totalPaise: 4130000, depositPct: 100 }));
    const ping = calls.filter((c) => c.body.subject === 'New order');
    expect(ping).toHaveLength(1);
    expect(ping[0]!.body.text).toContain('₹41,300');
    expect(calls.at(-1)!.body.subject).toBe('New order');
  });

  it('still pings when the receipt fails, and a failing ping does not fail afterPaid or raise an alert', async () => {
    respond = async (u) => {
      if (u === RESEND) return new Response('no', { status: 500 });
      if (u === TG) throw new TypeError('network');
      return new Response('{"ok":true}', { status: 200 });
    };
    await expect(afterPaid(telegramEnv(), order())).resolves.toBeUndefined();
    expect(calls.filter((c) => c.url === TG)).toHaveLength(1);
    // The receipt failure is alerted (existing behaviour); the ping failure is only logged.
    const alertSubjects = calls.filter((c) => c.url === RESEND && c.body.to === 'alerts@example.com').map((c) => c.body.subject);
    expect(alertSubjects).toEqual(['Order order_ABCDEFGHIJ1234: receipt email failed']);
  });
});
