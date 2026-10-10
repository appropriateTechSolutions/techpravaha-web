import { describe, expect, it } from 'vitest';
import worker, { type Env } from '../src/index';

const env = {
  ALLOWED_ORIGINS: 'https://techpravaha.com,http://localhost:3000',
} as unknown as Env;
const ctx = {} as ExecutionContext;
const call = (req: Request) => worker.fetch(req, env, ctx);

describe('worker routes', () => {
  it('GET /health is ok', async () => {
    const res = await call(new Request('https://api.test/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; version: string };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe('string');
  });

  it('preflight from an allowed origin gets CORS headers', async () => {
    const res = await call(
      new Request('https://api.test/orders', { method: 'OPTIONS', headers: { Origin: 'https://techpravaha.com' } }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://techpravaha.com');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('preflight from a disallowed origin gets no ACAO header', async () => {
    const res = await call(
      new Request('https://api.test/orders', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('JSON responses carry CORS only for allowed origins', async () => {
    const ok = await call(new Request('https://api.test/health', { headers: { Origin: 'http://localhost:3000' } }));
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    const bad = await call(new Request('https://api.test/health', { headers: { Origin: 'https://evil.example' } }));
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('unknown path is a 404 JSON', async () => {
    const res = await call(new Request('https://api.test/nope'));
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('webhook without a signature is a 400 and a malformed status id is a 404', async () => {
    const wh = await call(new Request('https://api.test/webhooks/razorpay', { method: 'POST', body: '{}' }));
    expect(wh.status).toBe(400);
    const st = await call(new Request('https://api.test/orders/abc/status'));
    expect(st.status).toBe(404);
  });
});
