import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


async function load(ga?: string, clarity?: string) {
  vi.resetModules();
  vi.stubEnv('VITE_GA_ID', ga ?? '');
  vi.stubEnv('VITE_CLARITY_ID', clarity ?? '');
  return import('../app/lib/analytics');
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete window.gtag;
});
afterEach(() => vi.unstubAllEnvs());

describe('track', () => {
  it('is a no-op without gtag', async () => {
    const a = await load();
    expect(() => a.track('whatsapp_click', { page: '/' })).not.toThrow();
  });

  it('calls gtag event when present', async () => {
    const a = await load();
    const spy = vi.fn();
    window.gtag = spy;
    a.track('view_tier', { tier: 'websites-launch' });
    expect(spy).toHaveBeenCalledWith('event', 'view_tier', { tier: 'websites-launch' });
  });
});

describe('loadAnalytics', () => {
  it('injects nothing without ids', async () => {
    const a = await load();
    a.loadAnalytics();
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('injects nothing for placeholder ids', async () => {
    const a = await load('G-XXXXXXXXXX', 'xxxxxxxxxx');
    a.loadAnalytics();
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('injects GA4 and Clarity once when ids are set', async () => {
    const a = await load('G-ABC123DEF4', 'abcd1234ef');
    a.loadAnalytics();
    a.loadAnalytics();
    const srcs = [...document.head.querySelectorAll('script')].map((s) => s.src);
    expect(srcs.filter((s) => s.includes('googletagmanager.com/gtag/js?id=G-ABC123DEF4'))).toHaveLength(1);
    const inline = [...document.head.querySelectorAll('script')].map((s) => s.textContent).join('\n');
    expect(inline).toContain('"abcd1234ef"');
    expect(inline).toContain('clarity');
    expect(typeof window.gtag).toBe('function');
  });
});
