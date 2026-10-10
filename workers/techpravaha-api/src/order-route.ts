import { priced } from './catalogue';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import { CREATED_ORDER_TTL_SECONDS, putOrder, type OrderRecord } from './orders';
import { createOrder } from './razorpay';
import { validateOrderBody } from './validate';

const MAX_BODY_BYTES = 8 * 1024;

/**
 * POST /orders. The client sends only tierId + customer (+ page); the amount is always
 * taken from the catalogue via priced(), never from the request.
 */
export async function handleCreateOrder(req: Request, env: Env): Promise<Response> {
  const read = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!read.ok) return json({ error: 'body too large' }, 413, req, env);
  const raw = read.text;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid json' }, 400, req, env);
  }

  const v = validateOrderBody(body);
  if (!v.ok) {
    return json(v.fields.length ? { error: v.error, fields: v.fields } : { error: v.error }, 400, req, env);
  }
  const { tierId, customer, page } = v.value;

  const p = priced(tierId);
  if (!p) return json({ error: 'quote-only or unknown tier' }, 400, req, env);

  const receipt = `tp_${tierId}_${Date.now().toString(36)}`.slice(0, 40);
  let order;
  try {
    // No customer data in notes: Razorpay echoes notes back in API responses and webhook payloads.
    order = await createOrder(env, {
      amountPaise: p.amountPaise,
      receipt,
      notes: { tierId, service: p.service.name, tier: p.tier.label },
    });
  } catch {
    // createOrder has already logged the provider detail; the client only learns that it failed.
    return json({ error: 'payment provider error' }, 502, req, env);
  }

  const record: OrderRecord = {
    id: order.id,
    tierId,
    serviceName: p.service.name,
    tierLabel: p.tier.label,
    amountPaise: p.amountPaise,
    totalPaise: p.totalPaise,
    depositPct: p.depositPct,
    gst: p.gst,
    customer,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  if (page !== undefined) record.page = page;

  try {
    await putOrder(env.ORDERS, record, { ttl: CREATED_ORDER_TTL_SECONDS });
  } catch (err) {
    console.error('order store write failed', order.id, String(err));
    return json({ error: 'could not save order' }, 500, req, env);
  }

  return json(
    {
      orderId: order.id,
      amount: p.amountPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      tier: { label: p.tier.label },
      service: { name: p.service.name },
    },
    200,
    req,
    env,
  );
}
