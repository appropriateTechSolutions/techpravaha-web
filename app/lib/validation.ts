/**
 * Lead-form and checkout-form rules, mirroring workers/techpravaha-api/src/validate.ts
 * (`validateLeadBody`, `validateOrderBody`) and chars.ts, so anything these forms accept the Worker
 * accepts too and a 400 never lands a real visitor on the "didn't send" fallback. The Worker keeps its
 * own copy (no shared code across the two packages); tests/validation-parity.test.ts fails when the
 * two drift.
 */

/** Same pattern as the Worker's EMAIL_RE: a plain local part (no apostrophes), any non-space domain. */
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX = 254;

export const NAME_MIN = 2;
export const NAME_MAX = 80;

export const MESSAGE_MIN = 1;
export const MESSAGE_MAX = 2000;
/** The message counter appears from this length. */
export const MESSAGE_COUNTER_FROM = 1800;

/** Site URL (teardown): http or https, no whitespace, at most URL_MAX. Same pattern and cap as the Worker's HTTP_URL_RE. */
export const URL_RE = /^https?:\/\/\S+$/i;
export const URL_MAX = 300;

/** Characters allowed in a phone number, and the digit count. Foreign numbers pass; the Worker normalises Indian ones. */
export const PHONE_CHARS_RE = /^\+?[0-9 ().-]{10,24}$/;
export const PHONE_DIGITS_MIN = 10;
export const PHONE_DIGITS_MAX = 15;

/** Checkout (orders): an Indian mobile, optional +91, 91 or 0, after spaces and hyphens are removed. Same as the Worker's PHONE_RE. */
export const ORDER_PHONE_RE = /^(?:\+91|91|0)?[6-9]\d{9}$/;
/** Checkout GSTIN, checked after trim and upper-casing. Same as the Worker's GSTIN_RE. */
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
/** Checkout company name (optional). */
export const COMPANY_MAX = 120;

/** Single-line fields: control, zero-width, bidi and BOM characters, invisible when pasted. */
export const CONTROL_RE =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;

/** Free text: as CONTROL_RE, but tab, newline and carriage return are allowed, and so are U+200C and U+200D. */
export const TEXT_CONTROL_RE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;

export const HIDDEN_CHAR_HINT = 'It has a hidden character, probably from a paste. Retype it.';

/** True when `phone` (as typed) is a number the Worker accepts. */
export function phoneOk(phone: string): boolean {
  const t = phone.trim();
  const digits = t.replace(/\D/g, '').length;
  return PHONE_CHARS_RE.test(t) && digits >= PHONE_DIGITS_MIN && digits <= PHONE_DIGITS_MAX;
}
