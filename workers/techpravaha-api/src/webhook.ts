import { sendAlert, sendReceipt } from './email';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import { getPaymentOrderId, markPaid, type OrderRecord } from './orders';
import { verifyWebhookSignature } from './razorpay';
import { appendOrderRow } from './sheets';
import { safeErrorText } from './upstream';

// Razorpay payment.captured payloads are a few KB; this only stops an unsigned flood being buffered.
const MAX_WEBHOOK_BYTES = 64 * 1024;
const RZP_ID_RE = /^[A-Za-z0-9_]{1,64}$/;

const rzpId = (v: unknown): string | null => (typeof v === 'string' && RZP_ID_RE.test(v) ? v : null);

/** Send an alert; if that fails too, the console is the last resort. Never throws. */
export async function alertSafely(env: Env, subject: string, body: string): Promise<void> {
  try {
    await sendAlert(env, subject, body);
  } catch (err) {
    console.error('alert failed', subject, safeErrorText(err));
  }
}

/**
 * Post-payment side effects. Each step runs regardless of the other; any failure becomes an
 * alert carrying the order id, payment id and an alert-safe error description, never customer data.
 */
export async function afterPaid(env: Env, o: OrderRecord): Promise<void> {
  const steps: [string, () => Promise<void>][] = [
    ['sheet append', () => appendOrderRow(env, o)],
    ['receipt email', () => sendReceipt(env, o)],
  ];
  for (const [step, run] of steps) {
    try {
      await run();
    } catch (err) {
      const why = safeErrorText(err);
      console.error('afterPaid step failed', o.id, step, why);
      await alertSafely(
        env,
        `Order ${o.id}: ${step} failed`,
        `The ${step} step failed for order ${o.id} (payment ${o.paymentId ?? 'unknown'}): ${why}.\n` +
          'The order is marked paid in KV. Redo this step by hand; customer details are in the Razorpay dashboard.',
      );
    }
  }
}

/**
 * POST /webhooks/razorpay. Order of operations matters: capped raw body, signature over the exact
 * bytes, parse, event filter, payment-id replay guard, markPaid, then side effects via waitUntil.
 *
 * After a valid signature the answer is 2xx, with one exception: a KV failure before the payment
 * index is written answers 500, because nothing durable records the payment yet and a Razorpay
 * retry is the right recovery (a retry that finds the order paid but unindexed raises the
 * "check receipt and Sheet row" alert). If KV fails after the index is written, a retry would be
 * deduplicated and do nothing, so that case alerts ("paid, side effects not run") and answers 200.
 * When the index was not written, or its state cannot be read at all, we answer 500 and send a
 * "store error, Razorpay will retry" alert, accepting a possible extra alert if the retry succeeds. The residual gap is a double fault: KV down for the
 * retries too, and the alert email failing, which leaves only the console log and Razorpay's dashboard.
 */
export async function handleRazorpayWebhook(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const read = await readBodyCapped(req, MAX_WEBHOOK_BYTES);
  if (!read.ok) return json({ error: 'body too large' }, 413, req, env);

  const valid = await verifyWebhookSignature(
    env.RAZORPAY_WEBHOOK_SECRET,
    read.bytes,
    req.headers.get('X-Razorpay-Signature'),
  );
  if (!valid) {
    // Only Razorpay's event id header (format-checked); never the body or the signature.
    console.warn('razorpay webhook: bad signature', rzpId(req.headers.get('X-Razorpay-Event-Id')) ?? '(no event id)');
    return json({ error: 'bad signature' }, 400, req, env);
  }

  let evt: { event?: unknown; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    evt = JSON.parse(read.text) as typeof evt;
  } catch {
    console.error('razorpay webhook: signed body is not JSON');
    return json({ ok: true, ignored: 'invalid json' }, 200, req, env);
  }
  if (evt?.event !== 'payment.captured') {
    const name = typeof evt?.event === 'string' ? evt.event.slice(0, 64) : null;
    return json({ ok: true, ignored: name }, 200, req, env);
  }

  const entity = evt.payload?.payment?.entity ?? {};
  const paymentId = rzpId(entity.id);
  const orderId = rzpId(entity.order_id);
  const amount = entity.amount;
  const currency = entity.currency;
  if (!paymentId || !orderId) {
    ctx.waitUntil(
      alertSafely(
        env,
        'Razorpay webhook: payment.captured without usable ids',
        `A signed payment.captured event arrived without a valid payment id or order id (payment ${paymentId ?? 'missing'}, order ${orderId ?? 'missing'}). Check the Razorpay dashboard.`,
      ),
    );
    return json({ ok: true, ignored: 'malformed' }, 200, req, env);
  }

  try {
    if ((await getPaymentOrderId(env.ORDERS, paymentId)) !== null) {
      return json({ ok: true, duplicate: true }, 200, req, env);
    }

    const { result, order } = await markPaid(env.ORDERS, orderId, paymentId);

    if (result === 'missing') {
      ctx.waitUntil(
        alertSafely(
          env,
          `Payment for unknown order ${orderId}`,
          `Razorpay captured payment ${paymentId} (${String(amount)} paise ${String(currency)}) for order ${orderId}, ` +
            'which is not in KV (expired after 7 days unpaid, or created elsewhere). Fulfil or refund by hand.',
        ),
      );
      return json({ ok: true, unknown: true }, 200, req, env);
    }

    if (result === 'already') {
      // A different payment captured against an order that is already paid means the customer paid twice.
      if (order?.paymentId && order.paymentId !== paymentId) {
        ctx.waitUntil(
          alertSafely(
            env,
            `Order ${orderId}: second payment captured`,
            `Order ${orderId} was already paid by ${order.paymentId}; Razorpay has now captured ${paymentId} ` +
              `(${String(amount)} paise) against it too. A refund is likely needed.`,
          ),
        );
      } else {
        // Same payment, order already paid, yet no payment index: an earlier delivery stopped between
        // the two KV writes (and got a 500), or two deliveries raced. Side effects may never have run.
        ctx.waitUntil(
          alertSafely(
            env,
            `Order ${orderId}: check receipt and Sheet row`,
            `Order ${orderId} was already marked paid by ${paymentId}, but the payment index was missing. ` +
              'If no Sheet row or receipt exists for this order, send them by hand.',
          ),
        );
      }
      return json({ ok: true, duplicate: true }, 200, req, env);
    }

    // 'updated': `order` is the paid record markPaid just wrote; no second KV read.
    const paid = order!;
    if (amount !== paid.amountPaise || currency !== 'INR') {
      ctx.waitUntil(
        alertSafely(
          env,
          `Order ${orderId}: amount mismatch`,
          `Payment ${paymentId} captured ${String(amount)} paise ${String(currency)}, but order ${orderId} expects ` +
            `${paid.amountPaise} paise INR. The order is marked paid; check the Razorpay dashboard.`,
        ),
      );
    }
    ctx.waitUntil(afterPaid(env, paid));
    return json({ ok: true }, 200, req, env);
  } catch (err) {
    const why = safeErrorText(err);
    console.error('razorpay webhook: order store failed', orderId, paymentId, why);
    let indexed = false;
    try {
      indexed = (await getPaymentOrderId(env.ORDERS, paymentId)) !== null;
    } catch {
      // KV still down: nothing provably recorded, so let Razorpay retry.
    }
    if (indexed) {
      // A retry would hit the replay guard and do nothing, so this alert is the only recovery path.
      ctx.waitUntil(
        alertSafely(
          env,
          `Order ${orderId}: paid, side effects not run`,
          `Payment ${paymentId} for order ${orderId} was recorded, but processing stopped (${why}) before the ` +
            'Sheet row and receipt were sent. Check KV shows the order paid, then add the row and send the receipt by hand.',
        ),
      );
      return json({ ok: true }, 200, req, env);
    }
    // Index not written (or unreadable): answer 500 so Razorpay retries, and the retry runs the side
    // effects itself. This alert has its own subject so nobody sends a duplicate receipt by hand.
    ctx.waitUntil(
      alertSafely(
        env,
        `Order ${orderId}: store error, Razorpay will retry`,
        `Payment ${paymentId} for order ${orderId} was captured, but the order store failed (${why}) before the payment was recorded. ` +
          'Razorpay will retry the webhook, and a successful retry adds the Sheet row and sends the receipt. ' +
          'Wait about an hour; act only if no Sheet row or receipt appears for this order.',
      ),
    );
    return json({ error: 'storage error' }, 500, req, env);
  }
}
