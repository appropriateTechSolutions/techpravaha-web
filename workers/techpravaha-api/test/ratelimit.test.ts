import { afterEach, describe, expect, it, vi } from 'vitest';
import { allow, clientIp, rateKey } from '../src/ratelimit';
import { fakeRateLimit } from './helpers/fake-ratelimit';

describe('allow (Workers Rate Limiting wrapper)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes the key through and reports the binding outcome', async () => {
    const rl = fakeRateLimit(2);
    const ns = rl as unknown as RateLimit;
    expect(await allow(ns, '1.2.3.4')).toEqual({ ok: true });
    expect(await allow(ns, '1.2.3.4')).toEqual({ ok: true });
    expect(await allow(ns, '1.2.3.4')).toEqual({ ok: false });
    expect(await allow(ns, '5.6.7.8')).toEqual({ ok: true });
    expect(rl.keys).toEqual(['1.2.3.4', '1.2.3.4', '1.2.3.4', '5.6.7.8']);
  });

  it('fails open when the binding throws, and logs without the key', async () => {
    const errors: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(a));
    const broken = {
      limit: async () => {
        throw new Error('rate limiter unavailable for 9.9.9.9');
      },
    } as unknown as RateLimit;
    expect(await allow(broken, '9.9.9.9')).toEqual({ ok: true });
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toContain('9.9.9.9');
  });

  it('keys on CF-Connecting-IP, or a shared unknown bucket', () => {
    expect(clientIp(new Request('https://x.test', { headers: { 'CF-Connecting-IP': '203.0.113.7' } }))).toBe('203.0.113.7');
    expect(clientIp(new Request('https://x.test', { headers: { 'CF-Connecting-IP': '2001:db8:1:2:aaaa::1' } }))).toBe(
      '2001:db8:1:2::/64',
    );
    expect(clientIp(new Request('https://x.test'))).toBe('unknown');
  });

  it('keys IPv4 by the full address', () => {
    expect(rateKey('203.0.113.7')).toBe('203.0.113.7');
    expect(rateKey('203.0.113.8')).toBe('203.0.113.8');
    expect(rateKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('keys IPv6 by its /64, so every address in one /64 shares a bucket', () => {
    const key = '2001:db8:abcd:12::/64';
    for (const ip of [
      '2001:db8:abcd:12::1',
      '2001:0db8:abcd:0012:ffff:ffff:ffff:fffe',
      '2001:DB8:ABCD:12:1:2:3:4',
      '2001:db8:abcd:12:5::9',
    ]) {
      expect(rateKey(ip)).toBe(key);
    }
    expect(rateKey('2001:db8:abcd:13::1')).toBe('2001:db8:abcd:13::/64');
    expect(rateKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateKey('::1')).toBe('0:0:0:0::/64');
    expect(rateKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });
});
