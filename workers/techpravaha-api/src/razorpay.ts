import type { Env } from './env';

const ORDERS_URL = 'https://api.razorpay.com/v1/orders';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface CreateOrderInput {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: 'INR';
}

/** Any failure talking to Razorpay. The message is for logs only; never send it to the client. */
export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'RazorpayError';
  }
}

// Bound at call time so tests can stub globalThis.fetch, and so `fetch` is never called with a foreign `this`.
const globalFetch: typeof fetch = (input, init) => fetch(input, init);

export async function createOrder(
  env: Pick<Env, 'RAZORPAY_KEY_ID' | 'RAZORPAY_KEY_SECRET'>,
  input: CreateOrderInput,
  fetchImpl: typeof fetch = globalFetch,
  opts: { timeoutMs?: number } = {},
): Promise<RazorpayOrder> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new RazorpayError('razorpay credentials are not configured');
  }
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new RazorpayError(`refusing to create an order for amount ${input.amountPaise}`);
  }

  let res: Response;
  try {
    res = await fetchImpl(ORDERS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    console.error('razorpay createOrder request failed', name, String(err));
    throw new RazorpayError(`razorpay request failed: ${name}`);
  }

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.error('razorpay createOrder non-2xx', res.status, text.slice(0, 2000));
    throw new RazorpayError(`razorpay responded ${res.status}`, res.status);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('razorpay createOrder unparseable body', text.slice(0, 2000));
    throw new RazorpayError('razorpay returned invalid JSON', res.status);
  }
  const o = data as { id?: unknown; amount?: unknown; currency?: unknown };
  if (typeof o.id !== 'string' || !o.id || o.amount !== input.amountPaise || o.currency !== 'INR') {
    // Shape fields only: the full order echoes notes, which must never reach logs.
    console.error('razorpay createOrder unexpected order', {
      id: typeof o.id === 'string' ? o.id.slice(0, 40) : typeof o.id,
      amount: o.amount,
      currency: o.currency,
    });
    throw new RazorpayError('razorpay returned an unexpected order', res.status);
  }
  return { id: o.id, amount: o.amount, currency: 'INR' };
}

const SIG_RE = /^[0-9a-fA-F]{64}$/; // hex-encoded HMAC-SHA256
const encoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Constant-time over equal-length inputs: the loop never exits early on a mismatch. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Verify Razorpay's X-Razorpay-Signature: hex(HMAC-SHA256(secret, rawBody)).
 * `rawBody` must be the exact request bytes (preferred) or text, before any JSON parsing.
 */
export async function verifyWebhookSignature(
  secret: string,
  rawBody: string | Uint8Array,
  signature: string | null,
): Promise<boolean> {
  if (!secret || !signature || !SIG_RE.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody;
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  return timingSafeEqual(mac, hexToBytes(signature));
}
