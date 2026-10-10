import pkg from '../package.json';
import { preflight } from './cors';
import type { Env } from './env';
import { allowedOrigins, json } from './http';
import { handleCreateOrder } from './order-route';
import { handleOrderStatus } from './status-route';
import { handleRazorpayWebhook } from './webhook';

// Re-exported for compatibility; new modules import from ./env and ./http, never from the entry module.
export type { Env } from './env';
export { allowedOrigins, json } from './http';

const STATUS_RE = /^\/orders\/([^/]+)\/status$/;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const pre = preflight(req, allowedOrigins(env));
    if (pre) return pre;

    const { pathname } = new URL(req.url);

    if (req.method === 'GET' && pathname === '/health') {
      return json({ ok: true, version: pkg.version }, 200, req, env);
    }
    if (req.method === 'POST' && pathname === '/orders') {
      return handleCreateOrder(req, env);
    }
    if (req.method === 'POST' && pathname === '/webhooks/razorpay') {
      return handleRazorpayWebhook(req, env, ctx);
    }
    const status = req.method === 'GET' ? STATUS_RE.exec(pathname) : null;
    if (status) {
      return handleOrderStatus(req, env, status[1]!);
    }
    return json({ error: 'not found' }, 404, req, env);
  },
};
