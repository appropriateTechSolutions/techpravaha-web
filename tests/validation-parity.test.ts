import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMPANY_MAX,
  CONTROL_RE,
  EMAIL_MAX,
  GSTIN_RE,
  EMAIL_RE,
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
  NAME_MIN,
  ORDER_PHONE_RE,
  PHONE_CHARS_RE,
  PHONE_DIGITS_MAX,
  PHONE_DIGITS_MIN,
  TEXT_CONTROL_RE,
  URL_MAX,
  URL_RE,
} from '../app/lib/validation';
import { validateCheckout } from '../app/components/CheckoutForm';
import { normalisePhone, validateOrderBody } from '../workers/techpravaha-api/src/validate';
import { CONTROL_RE as WORKER_CONTROL_RE, TEXT_CONTROL_RE as WORKER_TEXT_CONTROL_RE } from '../workers/techpravaha-api/src/chars';

// The Worker is a separate package, so its rules are read as text: the lead forms must never accept
// what POST /leads refuses (a 400 lands a real visitor on the "didn't send" fallback).
const workerSrc = readFileSync(resolve(__dirname, '../workers/techpravaha-api/src/validate.ts'), 'utf8');

function workerRegex(name: string): string {
  const m = new RegExp(`const ${name} = /(.+)/[a-z]*;`).exec(workerSrc);
  if (!m) throw new Error(`${name} not found in validate.ts`);
  return m[1]!;
}

/** The limits passed to `text(body.<field>, min, max[, controls])` in validateLeadBody. */
function workerLimits(field: string): [number, number] {
  const m = new RegExp(`text\\(body\\.${field}, (\\d+), (\\d+)`).exec(workerSrc);
  if (!m) throw new Error(`text(body.${field}, ...) not found in validate.ts`);
  return [Number(m[1]), Number(m[2])];
}

describe('lead form rules mirror the Worker', () => {
  it('site url pattern and length', () => {
    expect(URL_RE.source).toBe(workerRegex('HTTP_URL_RE'));
    const m = /body\.url, \(s\) => \{\s*const u = text\(s, (\d+), (\d+)/.exec(workerSrc);
    expect(m && [Number(m[1]), Number(m[2])]).toEqual([1, URL_MAX]);
  });

  it('email pattern and length', () => {
    expect(EMAIL_RE.source).toBe(workerRegex('EMAIL_RE'));
    expect(workerLimits('email')).toEqual([3, EMAIL_MAX]);
  });

  it('name limits', () => {
    expect(workerLimits('name')).toEqual([NAME_MIN, NAME_MAX]);
  });

  it('message limits, with the free-text control set', () => {
    expect(workerLimits('message')).toEqual([MESSAGE_MIN, MESSAGE_MAX]);
    expect(workerSrc).toMatch(/text\(body\.message, \d+, \d+, TEXT_CONTROL_RE\)/);
  });

  it('phone characters and digit count', () => {
    expect(PHONE_CHARS_RE.source).toBe(workerRegex('LOOSE_PHONE_RE'));
    expect(workerSrc).toContain(`digits >= ${PHONE_DIGITS_MIN} && digits <= ${PHONE_DIGITS_MAX}`);
  });

  it('control-character sets agree on every UTF-16 code unit', () => {
    const diffs: string[] = [];
    for (let c = 0; c <= 0xffff; c++) {
      const ch = String.fromCharCode(c);
      if (CONTROL_RE.test(ch) !== WORKER_CONTROL_RE.test(ch)) diffs.push(`CONTROL U+${c.toString(16)}`);
      if (TEXT_CONTROL_RE.test(ch) !== WORKER_TEXT_CONTROL_RE.test(ch)) diffs.push(`TEXT U+${c.toString(16)}`);
    }
    expect(diffs).toEqual([]);
  });
});

/** The limits passed to `text(c.<field>, min, max)` in validateOrderBody. */
function orderLimits(field: string): [number, number] {
  const m = new RegExp(`text\\(c\\.${field}, (\\d+), (\\d+)\\)`).exec(workerSrc);
  if (!m) throw new Error(`text(c.${field}, ...) not found in validate.ts`);
  return [Number(m[1]), Number(m[2])];
}

describe('checkout form rules mirror the Worker (validateOrderBody)', () => {
  it('phone pattern (the Worker captures the 10 digits; the form only tests) and the stripped characters', () => {
    expect(ORDER_PHONE_RE.source).toBe(workerRegex('PHONE_RE').replace('([6-9]\\d{9})', '[6-9]\\d{9}'));
    expect(workerSrc).toContain("raw.replace(/[\\s-]/g, '')");
  });

  it('gstin pattern', () => {
    expect(GSTIN_RE.source).toBe(workerRegex('GSTIN_RE'));
  });

  it('name, email and company limits', () => {
    expect(orderLimits('name')).toEqual([NAME_MIN, NAME_MAX]);
    expect(orderLimits('email')).toEqual([3, EMAIL_MAX]);
    expect(workerSrc).toMatch(new RegExp(`optional\\(c\\.company, \\(s\\) => text\\(s, 1, ${COMPANY_MAX}\\)\\)`));
  });

  // Behaviour, not just source: every sample the form accepts, the Worker accepts too.
  const ok = { name: 'Asha Rao', email: 'asha@example.com', phone: '98765 43210', company: '', gstin: '' };
  const samples: Partial<typeof ok>[] = [
    {},
    { phone: '+91 98765-43210' },
    { phone: '09876543210' },
    { phone: '919876543210' },
    { phone: '5876543210' },
    { phone: '+44 7700 900123' },
    { name: 'A' },
    { name: 'x'.repeat(NAME_MAX) },
    { name: 'x'.repeat(NAME_MAX + 1) },
    { name: 'Asha\u200bRao' },
    { email: "o'brien@example.com" },
    { email: `${'a'.repeat(EMAIL_MAX - 12)}@example.com` },
    { email: `${'a'.repeat(EMAIL_MAX)}@example.com` },
    { company: 'Rao Bakes' },
    { company: 'x'.repeat(COMPANY_MAX) },
    { company: 'x'.repeat(COMPANY_MAX + 1) },
    { company: 'Rao\u202eBakes' },
    { gstin: '27abcde1234f1z5' },
    { gstin: '27ABCDE1234F1X5' },
    { gstin: '27ABCDE1234F0Z5' },
  ];
  it.each(samples.map((over) => [JSON.stringify(over).slice(0, 60), over] as const))('%s: form and Worker agree', (_, over) => {
    const v = { ...ok, ...over };
    const formOk = Object.keys(validateCheckout(v)).length === 0;
    const customer = {
      name: v.name.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      ...(v.company.trim() ? { company: v.company.trim() } : {}),
      ...(v.gstin.trim() ? { gstin: v.gstin.trim().toUpperCase() } : {}),
    };
    const workerOk = validateOrderBody({ tierId: 'websites-launch', customer }).ok;
    expect(formOk).toBe(workerOk);
  });

  it('normalisePhone accepts exactly what the form phone pattern accepts', () => {
    for (const p of ['9876543210', '+919876543210', '09876543210', '98765 43210', '5876543210', '98765432100', '+449876543210']) {
      expect(ORDER_PHONE_RE.test(p.replace(/[\s-]/g, '')), p).toBe(normalisePhone(p) !== null);
    }
  });
});
