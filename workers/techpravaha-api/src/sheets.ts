import { orderAmounts, splitTotal } from './catalogue';
import type { Env } from './env';
import type { OrderRecord } from './orders';
import type { LeadBody } from './validate';
import { globalFetch, UPSTREAM_TIMEOUT_MS, UpstreamError } from './upstream';

export type Cell = string | number;

// Leading characters that make Sheets (or Excel, after export) treat a cell as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

/** Neutralise spreadsheet formula injection: prefix a leading formula trigger with an apostrophe. */
export function escapeCell(v: Cell): Cell {
  return typeof v === 'string' && FORMULA_START.test(v) ? `'${v}` : v;
}

/**
 * One Sheet row, in this column order: timestamp (ISO), orderId, paymentId, service, tier,
 * price ex-GST (₹), GST (₹), total (₹), name, email, phone, company, GSTIN, page, status,
 * deposit charged now (₹), balance due at launch (₹). Price, GST and total are the full order;
 * a tier paid in full has deposit = total and balance 0.
 */
export function orderRow(o: OrderRecord): Cell[] {
  const amounts = orderAmounts(o);
  const { price, gst, total } = splitTotal(amounts.total * 100, o.gst);
  const row: Cell[] = [
    o.paidAt ?? new Date().toISOString(),
    o.id,
    o.paymentId ?? '',
    o.serviceName,
    o.tierLabel,
    price,
    gst,
    total,
    o.customer.name,
    o.customer.email,
    o.customer.phone,
    o.customer.company ?? '',
    o.customer.gstin ?? '',
    o.page ?? '',
    o.status,
    amounts.charged,
    amounts.balance,
  ];
  return row.map(escapeCell);
}

export type SheetType = 'order' | 'lead';

/**
 * One Sheet row for a lead, in this column order: timestamp (ISO), type (contact or lead_magnet),
 * name, email, phone, message, page, tier, order, url. Blank when not given; formula-escaped.
 */
export function leadRow(l: LeadBody, now: Date = new Date()): Cell[] {
  const row: Cell[] = [
    now.toISOString(),
    l.type,
    l.name,
    l.email,
    l.phone ?? '',
    l.message,
    l.page,
    l.tier ?? '',
    l.order ?? '',
    l.url ?? '',
  ];
  return row.map(escapeCell);
}

/**
 * POST { token, type, row } to the Apps Script web app, which routes by `type`: "order" to the
 * Orders tab, "lead" to the Leads tab. Apps Script answers the POST with a 302 to a
 * googleusercontent URL; fetch follows it (as a GET, which is what Apps Script expects) to the
 * JSON reply. Anything but a 2xx carrying { ok: true } is a failure: a wrong token, or a deployment
 * that serves a Google sign-in page, must surface as an alert rather than pass silently.
 */
export async function postToSheet(
  env: Pick<Env, 'SHEETS_WEBHOOK_URL' | 'SHEETS_WEBHOOK_TOKEN'>,
  type: SheetType,
  row: Cell[],
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> {
  if (!env.SHEETS_WEBHOOK_URL || !env.SHEETS_WEBHOOK_TOKEN) throw new UpstreamError('sheet webhook not configured');

  const res = await fetchImpl(env.SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: env.SHEETS_WEBHOOK_TOKEN, type, row }),
    redirect: 'follow',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new UpstreamError(`sheet responded ${res.status}`);

  let reply: unknown;
  try {
    reply = JSON.parse(text);
  } catch {
    throw new UpstreamError('sheet returned a non-JSON page (check the Apps Script deployment access)');
  }
  if ((reply as { ok?: unknown } | null)?.ok !== true) {
    throw new UpstreamError('sheet refused the row (check TP_ORDERS_TOKEN matches SHEETS_WEBHOOK_TOKEN)');
  }
}

export const appendOrderRow = (
  env: Pick<Env, 'SHEETS_WEBHOOK_URL' | 'SHEETS_WEBHOOK_TOKEN'>,
  o: OrderRecord,
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> => postToSheet(env, 'order', orderRow(o), fetchImpl);

export const appendLeadRow = (
  env: Pick<Env, 'SHEETS_WEBHOOK_URL' | 'SHEETS_WEBHOOK_TOKEN'>,
  l: LeadBody,
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> => postToSheet(env, 'lead', leadRow(l), fetchImpl);
