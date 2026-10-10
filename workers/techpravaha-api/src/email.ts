import { orderAmounts, splitTotal } from './catalogue';
import type { Env } from './env';
import type { OrderRecord } from './orders';
import { globalFetch, UPSTREAM_TIMEOUT_MS, UpstreamError } from './upstream';

const RESEND_URL = 'https://api.resend.com/emails';
const REPLY_TO = 'hello@techpravaha.com';
const SITE = 'https://techpravaha.com';

type ResendEnv = Pick<Env, 'RESEND_API_KEY' | 'FROM_EMAIL'>;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const inr = (rupees: number) => `₹${new Intl.NumberFormat('en-IN').format(rupees)}`;

/** BOOKING_URL is used only when it is an absolute https link; anything else falls back to the sentence. */
function bookingUrl(env: Pick<Env, 'BOOKING_URL'>): string | null {
  const u = env.BOOKING_URL?.trim();
  return u && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null;
}

/** WHATSAPP_NUMBER as wa.me digits, or null when unset or still a placeholder. */
function whatsappUrl(env: Pick<Env, 'WHATSAPP_NUMBER'>): string | null {
  const raw = env.WHATSAPP_NUMBER?.trim() ?? '';
  if (!/^\+?[\d\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export function intakeUrl(o: Pick<OrderRecord, 'id' | 'tierId'>): string {
  return `${SITE}/contact/?order=${encodeURIComponent(o.id)}&tier=${encodeURIComponent(o.tierId)}`;
}

/** Subject, plain text and HTML for the customer's receipt. Exported for tests. */
export function receiptContent(
  env: Pick<Env, 'BOOKING_URL' | 'WHATSAPP_NUMBER'>,
  o: OrderRecord,
): { subject: string; text: string; html: string } {
  const amounts = orderAmounts(o);
  const { price, gst, total, rate } = splitTotal(amounts.total * 100, o.gst);
  const partPaid = amounts.balance > 0;
  const gstLabel = `GST (${Math.round(rate * 100)}%)`;
  const intake = intakeUrl(o);
  const booking = bookingUrl(env);
  const whatsapp = whatsappUrl(env);
  const subject = `Your Tech Pravaha order ${o.id}`;

  const summary: [string, string][] = [
    ['Service', o.serviceName],
    ['Tier', o.tierLabel],
    ['Price', inr(price)],
    [gstLabel, inr(gst)],
    ...(partPaid
      ? ([
          ['Total', inr(total)],
          [`Deposit paid (${amounts.depositPct}%)`, inr(amounts.charged)],
          ['Balance due at launch', inr(amounts.balance)],
        ] as [string, string][])
      : ([['Total paid', inr(total)]] as [string, string][])),
    ['Order id', o.id],
    ['Razorpay payment id', o.paymentId ?? ''],
  ];

  const kickoffText = booking
    ? `Book your kickoff call: ${booking}`
    : 'Kickoff call: We will send you a kickoff slot within one working day.';
  const text = [
    `Hi ${o.customer.name},`,
    '',
    'Thank you for your order with Tech Pravaha. Your payment is confirmed.',
    '',
    'Order summary',
    ...summary.map(([k, v]) => `${k}: ${v}`),
    '',
    'What happens next',
    `1. Tell us about your project in the intake form: ${intake}`,
    `2. ${kickoffText}`,
    '3. A GST invoice follows within one working day.',
    '',
    'Questions? Just reply to this email.',
    ...(whatsapp ? [`Prefer WhatsApp? Message us at ${whatsapp}`] : []),
    '',
    'Yogesh, Tech Pravaha',
    '',
  ].join('\n');

  const e = escapeHtml;
  const link = (href: string, label: string) => `<a href="${e(href)}">${e(label)}</a>`;
  const kickoffHtml = booking
    ? `Book your kickoff call: ${link(booking, 'choose a slot')}`
    : 'Kickoff call: We will send you a kickoff slot within one working day.';
  const html = [
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111">',
    `<p>Hi ${e(o.customer.name)},</p>`,
    '<p>Thank you for your order with Tech Pravaha. Your payment is confirmed.</p>',
    '<h3 style="margin:16px 0 8px">Order summary</h3>',
    '<table cellpadding="4" style="border-collapse:collapse">',
    ...summary.map(([k, v]) => `<tr><td style="color:#555">${e(k)}</td><td><strong>${e(v)}</strong></td></tr>`),
    '</table>',
    '<h3 style="margin:16px 0 8px">What happens next</h3>',
    '<ol>',
    `<li>Tell us about your project in the ${link(intake, 'intake form')}.</li>`,
    `<li>${kickoffHtml}</li>`,
    '<li>A GST invoice follows within one working day.</li>',
    '</ol>',
    '<p>Questions? Just reply to this email.',
    whatsapp ? `<br>Prefer WhatsApp? ${link(whatsapp, 'Message us on WhatsApp')}.` : '',
    '</p>',
    '<p>Yogesh, Tech Pravaha</p>',
    '</body></html>',
  ].join('\n');

  return { subject, text, html };
}

async function resend(env: ResendEnv, payload: Record<string, unknown>, fetchImpl: typeof fetch): Promise<void> {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) throw new UpstreamError('resend not configured');
  const res = await fetchImpl(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, ...payload }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    // The body can echo addresses, so it stays out of the thrown message (which reaches alert emails).
    await res.body?.cancel().catch(() => {});
    throw new UpstreamError(`resend responded ${res.status}`);
  }
  await res.body?.cancel().catch(() => {});
}

export async function sendReceipt(
  env: ResendEnv & Pick<Env, 'BOOKING_URL' | 'WHATSAPP_NUMBER'>,
  o: OrderRecord,
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> {
  const { subject, text, html } = receiptContent(env, o);
  await resend(env, { to: o.customer.email, reply_to: REPLY_TO, subject, text, html }, fetchImpl);
}

export async function sendAlert(
  env: ResendEnv & Pick<Env, 'ALERT_EMAIL'>,
  subject: string,
  body: string,
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> {
  if (!env.ALERT_EMAIL) throw new UpstreamError('ALERT_EMAIL not configured');
  await resend(env, { to: env.ALERT_EMAIL, subject, text: body }, fetchImpl);
}
