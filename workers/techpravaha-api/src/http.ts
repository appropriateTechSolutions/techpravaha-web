import { cors } from './cors';
import type { Env } from './env';

export function allowedOrigins(env: Pick<Env, 'ALLOWED_ORIGINS'>): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function json(body: unknown, status: number, req: Request, env: Pick<Env, 'ALLOWED_ORIGINS'>): Response {
  const headers = new Headers(cors(req.headers.get('Origin'), allowedOrigins(env)));
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

/** `bytes` is the exact body as received (verify signatures over it); `text` is its UTF-8 decoding. */
export type CappedBody = { ok: true; text: string; bytes: Uint8Array } | { ok: false };

/**
 * Read a request body as UTF-8 text, refusing anything over `maxBytes`.
 * A declared Content-Length over the cap is refused before reading; otherwise the stream is
 * read chunk by chunk and abandoned as soon as it passes the cap, so a lying or absent
 * Content-Length cannot make the Worker buffer an arbitrarily large body.
 */
export async function readBodyCapped(req: Request, maxBytes: number): Promise<CappedBody> {
  const declared = Number(req.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false };
  if (!req.body) return { ok: true, text: '', bytes: new Uint8Array(0) };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes), bytes };
}
