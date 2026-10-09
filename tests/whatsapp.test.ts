import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(num?: string) {
  vi.resetModules();
  if (num !== undefined) vi.stubEnv('VITE_WHATSAPP_NUMBER', num);
  return import('../app/lib/whatsapp');
}

afterEach(() => vi.unstubAllEnvs());

describe('whatsapp', () => {
  it('builds a wa.me link when the number is set', async () => {
    const w = await load('919999999999');
    expect(w.WHATSAPP_NUMBER).toBe('919999999999');
    expect(w.waLink('hi')).toBe('https://wa.me/919999999999?text=hi');
  });

  it('strips non-digits from the number', async () => {
    const w = await load('+91 99999-99999');
    expect(w.WHATSAPP_NUMBER).toBe('919999999999');
  });

  it('encodes the message', async () => {
    const w = await load('919999999999');
    expect(w.waLink('a b & c')).toBe('https://wa.me/919999999999?text=a%20b%20%26%20c');
  });

  it('falls back to /contact for the placeholder', async () => {
    const w = await load('91XXXXXXXXXX');
    expect(w.WHATSAPP_NUMBER).toBe('');
    expect(w.waLink('hi')).toBe('/contact');
  });

  it('falls back to /contact when empty', async () => {
    const w = await load('');
    expect(w.WHATSAPP_NUMBER).toBe('');
    expect(w.waLink('hi')).toBe('/contact');
  });

  it('falls back to /contact when undefined', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_WHATSAPP_NUMBER', undefined as unknown as string);
    const w = await import('../app/lib/whatsapp');
    expect(w.waLink('hi')).toBe('/contact');
  });

  it('writes a buy message with price and GST', async () => {
    const w = await load('919999999999');
    expect(w.tierMessage('Websites & landing pages', 'Launch', 35000)).toBe(
      'Hi Tech Pravaha, I want to buy Websites & landing pages · Launch (₹35,000 + GST).',
    );
  });

  it('writes a quote message when price is null', async () => {
    const w = await load('919999999999');
    expect(w.tierMessage('Apps', 'Bespoke', null)).toBe(
      "Hi Tech Pravaha, I'd like a quote for Apps · Bespoke.",
    );
  });
});
