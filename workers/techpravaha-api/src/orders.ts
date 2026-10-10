export interface OrderRecord {
  id: string; // Razorpay order id
  tierId: string;
  serviceName: string;
  tierLabel: string;
  /** Charged at checkout (the deposit for a part-paid tier), paise, GST included. */
  amountPaise: number;
  /** Full order value, paise, GST included. Absent on records written before deposits: paid in full. */
  totalPaise?: number;
  /** Share of the total charged at checkout, 1 to 100. Absent means 100. */
  depositPct?: number;
  /** GST rate at order time (e.g. 0.18), so the price/GST split never depends on today's catalogue. */
  gst: number;
  customer: { name: string; email: string; phone: string; gstin?: string; company?: string };
  status: 'created' | 'paid';
  paymentId?: string;
  createdAt: string;
  paidAt?: string;
  page?: string;
}

/** The slice of KVNamespace the order store uses; a real KVNamespace satisfies it. */
export interface OrderKV {
  get(key: string, options: { type: 'json'; cacheTtl?: number }): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type MarkPaidResult = 'updated' | 'already' | 'missing';

/**
 * `order` is the record markPaid read: for 'updated' the paid version it wrote, for 'already'
 * the existing paid record (whose paymentId may differ), for 'missing' null.
 */
export interface MarkPaidOutcome {
  result: MarkPaidResult;
  order: OrderRecord | null;
}

const orderKey = (id: string) => `order:${id}`;
const paymentKey = (paymentId: string) => `payment:${paymentId}`;

/** Unpaid orders expire after a week; a paid record is rewritten without a TTL and kept. */
export const CREATED_ORDER_TTL_SECONDS = 7 * 24 * 3600;

export async function putOrder(kv: OrderKV, o: OrderRecord, opts: { ttl?: number } = {}): Promise<void> {
  const value = JSON.stringify(o);
  if (opts.ttl !== undefined) await kv.put(orderKey(o.id), value, { expirationTtl: opts.ttl });
  else await kv.put(orderKey(o.id), value);
}

/**
 * `cacheTtl` (seconds, KV minimum 30) bounds how long this edge location may serve a cached value.
 * Only the public status route passes it; the webhook path reads with KV's default.
 */
export async function getOrder(kv: OrderKV, id: string, opts: { cacheTtl?: number } = {}): Promise<OrderRecord | null> {
  const options = opts.cacheTtl !== undefined ? { type: 'json' as const, cacheTtl: opts.cacheTtl } : { type: 'json' as const };
  return ((await kv.get(orderKey(id), options)) as OrderRecord | null) ?? null;
}

/** Order id previously recorded for a payment, or null if this payment has never been seen. */
export async function getPaymentOrderId(kv: OrderKV, paymentId: string): Promise<string | null> {
  const v = await kv.get(paymentKey(paymentId), { type: 'json' });
  return typeof v === 'string' ? v : null;
}

/**
 * Idempotent: an already-paid order returns 'already' and nothing is written.
 * The payment index (payment:<paymentId> → orderId) is written for 'updated' and 'missing',
 * so a replay is detectable even when the order record never existed.
 * KV is eventually consistent with no compare-and-set, so two concurrent first deliveries
 * can both see 'created'; callers must keep side effects safe to repeat in that window.
 */
export async function markPaid(kv: OrderKV, id: string, paymentId: string): Promise<MarkPaidOutcome> {
  const order = await getOrder(kv, id);
  if (order?.status === 'paid') return { result: 'already', order };
  let paid: OrderRecord | null = null;
  if (order) {
    paid = { ...order, status: 'paid', paymentId, paidAt: new Date().toISOString() };
    await putOrder(kv, paid);
  }
  await kv.put(paymentKey(paymentId), JSON.stringify(id));
  return paid ? { result: 'updated', order: paid } : { result: 'missing', order: null };
}
