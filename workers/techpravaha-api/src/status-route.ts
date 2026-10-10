import type { Env } from './env';
import { json } from './http';
import { getOrder } from './orders';

// Cloudflare caches a KV read at the edge location for cacheTtl seconds (default 60). The minimum, 30,
// lets a buyer polling /thanks see the webhook's "paid" write sooner.
const STATUS_CACHE_TTL_SECONDS = 30;

// Razorpay order ids: "order_" plus 14 alphanumerics today; allow a little slack either way.
const ORDER_ID_RE = /^order_[A-Za-z0-9]{10,20}$/;

/** GET /orders/:id/status. Public by order id, so it returns order facts only, never customer data. */
export async function handleOrderStatus(req: Request, env: Env, id: string): Promise<Response> {
  if (!ORDER_ID_RE.test(id)) return json({ error: 'not found' }, 404, req, env);
  let o;
  try {
    o = await getOrder(env.ORDERS, id, { cacheTtl: STATUS_CACHE_TTL_SECONDS });
  } catch (err) {
    console.error('order status read failed', id, err instanceof Error ? err.name : 'Error');
    return json({ error: 'unavailable' }, 503, req, env);
  }
  if (!o) return json({ error: 'not found' }, 404, req, env);
  return json(
    {
      status: o.status,
      tierId: o.tierId,
      tier: o.tierLabel,
      service: o.serviceName,
      amountPaise: o.amountPaise,
      totalPaise: o.totalPaise ?? o.amountPaise,
      depositPct: o.depositPct ?? 100,
    },
    200,
    req,
    env,
  );
}
