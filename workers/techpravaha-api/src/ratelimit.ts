import { safeErrorText } from './upstream';

/**
 * Thin wrapper over a Cloudflare Workers Rate Limiting binding (`[[ratelimits]]` in wrangler.toml).
 * The binding counts per Cloudflare location and is approximate by design: good for abuse control,
 * not for billing. It costs no KV writes.
 *
 * A binding error allows the request (fail open) and is logged without the key, which may hold an IP.
 */
export async function allow(rl: RateLimit, key: string): Promise<{ ok: boolean }> {
  try {
    const { success } = await rl.limit({ key });
    return { ok: success };
  } catch (err) {
    console.error('ratelimit: binding failed, allowing request', safeErrorText(err));
    return { ok: true };
  }
}

/**
 * The rate-limit key for the caller, from CF-Connecting-IP: an IPv4 address as is, an IPv6 address
 * by its /64 (first four hextets), since one host often holds a whole /64 and could otherwise send
 * every request from a fresh address. Every request without the header shares the 'unknown' bucket.
 */
export const clientIp = (req: Request): string => rateKey(req.headers.get('CF-Connecting-IP') ?? 'unknown');

export function rateKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  // IPv4-mapped IPv6 (::ffff:203.0.113.7) is an IPv4 client.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) return mapped[1]!;
  const addr = ip.split('%')[0]!.toLowerCase();
  const [head = '', tail] = addr.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const hextets = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${hextets
    .slice(0, 4)
    .map((h) => h.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`;
}
