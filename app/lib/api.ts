/**
 * Client for the techpravaha-api Worker (workers/techpravaha-api). The Worker owns
 * every secret and computes the amount from catalogue.json; the site only ever
 * sends a tier id and the customer's details.
 */

const DEFAULT_API_URL = 'https://api.techpravaha.com';

/** Worker base URL without a trailing slash. Read per call so tests can stub the env. */
export function apiUrl(): string {
  const raw = String(import.meta.env.VITE_API_URL ?? '').trim();
  return (raw || DEFAULT_API_URL).replace(/\/+$/, '');
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  company?: string;
  gstin?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  /** Paise charged now (the deposit for a part-paid tier), GST included, computed by the Worker. */
  amount: number;
  currency: 'INR';
  /** Razorpay public key id the order was created with. */
  keyId: string;
  tier: { label: string };
  service: { name: string };
}

export interface OrderStatus {
  status: 'created' | 'paid';
  /** Catalogue tier id, e.g. "websites-launch". Absent on an older Worker. */
  tierId?: string;
  /** Tier label, e.g. "Launch". */
  tier?: string;
  /** Service name, e.g. "Websites & landing pages". */
  service?: string;
  /** Charged at checkout (the deposit for a part-paid tier), paise, GST included. */
  amountPaise?: number;
  /** Full order value, paise, GST included. Absent on an older Worker. */
  totalPaise?: number;
  /** Share of the total charged at checkout, 1 to 100. Absent on an older Worker (treat as 100). */
  depositPct?: number;
}

/** A failed call. `status` 0 means the request never got a response (offline, blocked, timed out). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public fields: string[] = [],
  ) {
    super(`api ${status}`);
    this.name = 'ApiError';
  }
}

/** Razorpay order ids look like `order_` plus alphanumerics; anything else is never sent anywhere. */
export const ORDER_ID_RE = /^order_[A-Za-z0-9]{6,40}$/;

/**
 * fetch + JSON body under one timeout: the timer is cleared only after the body has
 * been read, so a server that sends headers and then stalls still times out.
 * `body` is null when the response has no JSON. Throws ApiError(0) on no response.
 */
async function request(path: string, init: RequestInit, timeoutMs: number): Promise<{ res: Response; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl()}${path}`, { ...init, signal: ctrl.signal });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      if (ctrl.signal.aborted) throw new ApiError(0);
    }
    return { res, body };
  } catch (err) {
    throw err instanceof ApiError ? err : new ApiError(0);
  } finally {
    clearTimeout(timer);
  }
}

/** POST /orders. Resolves with the Razorpay order to open; throws ApiError otherwise. */
export async function createOrder(input: {
  tierId: string;
  customer: Customer;
  page: string;
}): Promise<CreateOrderResponse> {
  const { res, body: raw } = await request(
    '/orders',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
    20_000,
  );
  const body = raw as (Partial<CreateOrderResponse> & { fields?: unknown }) | null;
  if (!res.ok) {
    const fields = Array.isArray(body?.fields) ? body.fields.filter((f): f is string => typeof f === 'string') : [];
    throw new ApiError(res.status, fields);
  }
  if (!body || typeof body.orderId !== 'string' || typeof body.amount !== 'number' || typeof body.keyId !== 'string') {
    throw new ApiError(res.status);
  }
  return body as CreateOrderResponse;
}

/** GET /orders/:id/status. Null when the Worker does not know the order (404); throws on anything else. */
export async function orderStatus(orderId: string): Promise<OrderStatus | null> {
  const { res, body: raw } = await request(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'GET' }, 8_000);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status);
  const body = raw as OrderStatus | null;
  if (!body || (body.status !== 'created' && body.status !== 'paid')) throw new ApiError(res.status);
  return body;
}
