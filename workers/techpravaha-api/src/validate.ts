import { hasTier } from './catalogue';
import { CONTROL_RE, TEXT_CONTROL_RE } from './chars';

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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Indian mobile: optional +91, 91 or 0, then 10 digits starting 6-9. Spaces and hyphens are ignored. */
export function normalisePhone(raw: string): string | null {
  const m = PHONE_RE.exec(raw.replace(/[\s-]/g, ''));
  return m ? `+91${m[1]}` : null;
}

/** Trimmed string within [min, max] chars and free of control characters, else null. */
function text(v: unknown, min: number, max: number, controls: RegExp = CONTROL_RE): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length < min || s.length > max || controls.test(s)) return null;
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

// ---- Leads (POST /leads) ----

export type LeadType = 'contact' | 'lead_magnet';

export interface LeadBody {
  type: LeadType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  page: string;
  tier?: string;
  order?: string;
  url?: string;
}

export type ValidatedLead =
  | { ok: true; value: LeadBody }
  | { ok: false; error: 'invalid body' | 'unexpected field' | 'invalid fields'; fields: string[] };

const LEAD_KEYS = new Set(['type', 'name', 'email', 'phone', 'message', 'page', 'tier', 'order', 'url']);

/** Same shape the site accepts from `?order=` (app/lib/api.ts), so an order id the form forwards is never refused here. */
export const ORDER_ID_RE = /^order_[A-Za-z0-9]{6,40}$/;
const HTTP_URL_RE = /^https?:\/\/\S+$/i;
// Mirrored by app/lib/validation.ts (PHONE_CHARS_RE and the digit count) for the lead forms; foreign numbers are fine on a lead.
const LOOSE_PHONE_RE = /^\+?[0-9 ().-]{10,24}$/;

/** A phone for a lead: an Indian mobile in canonical +91 form, else a plain international-looking number (10 to 15 digits). */
function leadPhone(s: string): string | null {
  const indian = normalisePhone(s);
  if (indian) return indian;
  const t = s.trim();
  const digits = t.replace(/\D/g, '').length;
  return LOOSE_PHONE_RE.test(t) && digits >= 10 && digits <= 15 ? t : null;
}

/**
 * Body of POST /leads. Required: type, name, email, message, page. Optional: phone, tier (a catalogue
 * tier id, buyable or not), order (Razorpay order id), url (http or https, at most 300 chars).
 * Unknown keys are refused. `fields` names fields only, never their values.
 *
 * The site's lead forms (app/lib/validation.ts) apply the same name, email, phone and message rules, so a
 * lead the form lets through is accepted here; tests/validation-parity.test.ts keeps the two in step.
 */
export function validateLeadBody(body: unknown): ValidatedLead {
  if (!isPlainObject(body)) return { ok: false, error: 'invalid body', fields: [] };

  const unexpected = Object.keys(body).filter((k) => !LEAD_KEYS.has(k));
  if (unexpected.length) return { ok: false, error: 'unexpected field', fields: unexpected };

  const bad: string[] = [];

  const type = body.type === 'contact' || body.type === 'lead_magnet' ? body.type : null;
  if (!type) bad.push('type');

  const name = text(body.name, 2, 80);
  if (!name) bad.push('name');

  const emailText = text(body.email, 3, 254);
  const email = emailText && EMAIL_RE.test(emailText) ? emailText : null;
  if (!email) bad.push('email');

  const phone = optional(body.phone, leadPhone);
  if (phone === null) bad.push('phone');

  const message = text(body.message, 1, 2000, TEXT_CONTROL_RE);
  if (!message) bad.push('message');

  const page = text(body.page, 1, 200);
  if (!page) bad.push('page');

  const tier = optional(body.tier, (s) => {
    const t = s.trim();
    return TIER_RE.test(t) && hasTier(t) ? t : null;
  });
  if (tier === null) bad.push('tier');

  const order = optional(body.order, (s) => (ORDER_ID_RE.test(s.trim()) ? s.trim() : null));
  if (order === null) bad.push('order');

  const url = optional(body.url, (s) => {
    const u = text(s, 1, 300);
    return u && HTTP_URL_RE.test(u) ? u : null;
  });
  if (url === null) bad.push('url');

  if (bad.length || !type || !name || !email || !message || !page || phone === null || tier === null || order === null || url === null) {
    return { ok: false, error: 'invalid fields', fields: bad };
  }

  const value: LeadBody = { type, name, email, message, page };
  if (phone !== undefined) value.phone = phone;
  if (tier !== undefined) value.tier = tier;
  if (order !== undefined) value.order = order;
  if (url !== undefined) value.url = url;
  return { ok: true, value };
}
