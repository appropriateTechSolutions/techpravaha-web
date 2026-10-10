export interface OrderBody {
  tierId: string;
  customer: { name: string; email: string; phone: string; company?: string; gstin?: string };
  page?: string;
}

export type Validated =
  | { ok: true; value: OrderBody }
  | { ok: false; error: 'invalid body' | 'unexpected field' | 'invalid fields'; fields: string[] };

const TOP_KEYS = new Set(['tierId', 'customer', 'page']);
const CUSTOMER_KEYS = new Set(['name', 'email', 'phone', 'company', 'gstin']);

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+91|91|0)?([6-9]\d{9})$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const TIER_RE = /^[a-z0-9-]{1,40}$/;
// C0 controls, DEL, C1 controls, soft hyphen, Arabic letter mark, zero-width and word-joiner
// characters, Unicode line/paragraph separators, bidi override/isolate characters, and the BOM:
// nothing a name or email needs, and the raw material of header injection and visual spoofing
// once these values reach email or the Sheet.
const CONTROL_RE =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Indian mobile: optional +91, 91 or 0, then 10 digits starting 6-9. Spaces and hyphens are ignored. */
export function normalisePhone(raw: string): string | null {
  const m = PHONE_RE.exec(raw.replace(/[\s-]/g, ''));
  return m ? `+91${m[1]}` : null;
}

/** Trimmed string within [min, max] chars and free of control characters, else null. */
function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length < min || s.length > max || CONTROL_RE.test(s)) return null;
  return s;
}

/** Optional field: absent, null or blank means "not given" (undefined); otherwise must pass `check`. */
function optional(v: unknown, check: (s: string) => string | null): string | undefined | null {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return typeof v === 'string' ? check(v) : null;
}

export function validateOrderBody(body: unknown): Validated {
  if (!isPlainObject(body)) return { ok: false, error: 'invalid body', fields: [] };

  const unexpected = Object.keys(body).filter((k) => !TOP_KEYS.has(k));
  if (isPlainObject(body.customer)) {
    for (const k of Object.keys(body.customer)) if (!CUSTOMER_KEYS.has(k)) unexpected.push(`customer.${k}`);
  }
  if (unexpected.length) return { ok: false, error: 'unexpected field', fields: unexpected };

  const bad: string[] = [];

  const tierId = typeof body.tierId === 'string' && TIER_RE.test(body.tierId) ? body.tierId : null;
  if (!tierId) bad.push('tierId');

  const page = optional(body.page, (s) => text(s, 1, 200));
  if (page === null) bad.push('page');

  if (!isPlainObject(body.customer)) {
    bad.push('customer');
    return { ok: false, error: 'invalid fields', fields: bad };
  }
  const c = body.customer;

  const name = text(c.name, 2, 80);
  if (!name) bad.push('customer.name');

  const emailText = text(c.email, 3, 254);
  const email = emailText && EMAIL_RE.test(emailText) ? emailText : null;
  if (!email) bad.push('customer.email');

  const phone = typeof c.phone === 'string' ? normalisePhone(c.phone) : null;
  if (!phone) bad.push('customer.phone');

  const company = optional(c.company, (s) => text(s, 1, 120));
  if (company === null) bad.push('customer.company');

  const gstin = optional(c.gstin, (s) => {
    const g = s.trim().toUpperCase();
    return GSTIN_RE.test(g) ? g : null;
  });
  if (gstin === null) bad.push('customer.gstin');

  if (bad.length || !tierId || !name || !email || !phone || company === null || gstin === null || page === null) {
    return { ok: false, error: 'invalid fields', fields: bad };
  }

  const customer: OrderBody['customer'] = { name, email, phone };
  if (company !== undefined) customer.company = company;
  if (gstin !== undefined) customer.gstin = gstin;
  const value: OrderBody = { tierId, customer };
  if (page !== undefined) value.page = page;
  return { ok: true, value };
}
