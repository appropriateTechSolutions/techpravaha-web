import { describe, expect, it } from 'vitest';
import {
  catalogue,
  formatINR,
  getService,
  getTier,
  tierFromPrice,
  validateCatalogue,
  withGst,
} from '../app/lib/catalogue';

const clone = () => structuredClone(catalogue) as any;
const tiers = catalogue.services.flatMap((s) => s.tiers);

describe('catalogue data', () => {
  it('loads and validates the shipped file', () => {
    expect(() => validateCatalogue(clone())).not.toThrow();
    expect(catalogue.currency).toBe('INR');
    expect(catalogue.gst).toBe(0.18);
    expect(catalogue.services.map((s) => s.id)).toEqual([
      'websites',
      'apps',
      'ai',
      'whatsapp',
      'content',
      'design',
    ]);
  });

  it('gives every service three tiers with 4-6 includes', () => {
    for (const s of catalogue.services) {
      expect(s.route).toBe(`/services/${s.id}`);
      expect(s.tiers.map((t) => t.id)).toEqual([
        `${s.id}-launch`,
        `${s.id}-growth`,
        `${s.id}-bespoke`,
      ]);
      for (const t of s.tiers) {
        expect(t.includes.length).toBeGreaterThanOrEqual(4);
        expect(t.includes.length).toBeLessThanOrEqual(6);
      }
    }
  });

  // Structural only, so a price edit in catalogue.json never needs a test change.
  // The launch prices live in spec section 4 (docs/superpowers/specs/2026-10-10-techpravaha-web-design.md);
  // catalogue.json is the source of truth after launch.
  it('gives every buyable tier an integer price above zero', () => {
    for (const t of tiers.filter((x) => x.buyable)) {
      expect(Number.isInteger(t.price), t.id).toBe(true);
      expect(t.price!, t.id).toBeGreaterThan(0);
    }
  });

  it('gives every non-buyable tier a `from` above zero', () => {
    for (const t of tiers.filter((x) => !x.buyable)) {
      expect(Number.isInteger(t.from), t.id).toBe(true);
      expect(t.from!, t.id).toBeGreaterThan(0);
    }
  });

  it('puts badges only on Growth tiers', () => {
    for (const t of tiers.filter((x) => x.badge)) {
      expect(t.name, t.id).toBe('Growth');
      expect(t.id, t.id).toMatch(/-growth$/);
    }
  });

  it('carries the Care add-on', () => {
    expect(catalogue.addons).toEqual([
      expect.objectContaining({ id: 'care', from: expect.any(Number), per: 'month', buyable: false }),
    ]);
  });

  it('contains no em-dashes in any string', () => {
    expect(JSON.stringify(catalogue)).not.toContain('—');
  });
});

describe('validateCatalogue', () => {
  it('throws on a buyable tier without a price', () => {
    const c = clone();
    c.services[0].tiers[0].price = null;
    expect(() => validateCatalogue(c)).toThrow(/catalogue: tier .* buyable without price/);
  });

  it('throws on duplicate tier ids', () => {
    const c = clone();
    c.services[1].tiers[0].id = c.services[0].tiers[0].id;
    expect(() => validateCatalogue(c)).toThrow(/duplicate tier id/);
  });

  it('throws on duplicate service ids', () => {
    const c = clone();
    c.services[1].id = c.services[0].id;
    expect(() => validateCatalogue(c)).toThrow(/catalogue: duplicate service id/);
  });

  it('throws on a non-integer price', () => {
    const c = clone();
    c.services[0].tiers[0].price = 350.5;
    expect(() => validateCatalogue(c)).toThrow(/catalogue: tier .* price/);
  });

  it('throws on empty includes', () => {
    const c = clone();
    c.services[0].tiers[0].includes = [];
    expect(() => validateCatalogue(c)).toThrow(/catalogue: tier .* includes/);
  });

  it('throws on non-object input and bad gst', () => {
    expect(() => validateCatalogue(null)).toThrow(/^catalogue:/);
    const c = clone();
    c.gst = 18;
    expect(() => validateCatalogue(c)).toThrow(/catalogue: gst/);
  });
});

describe('helpers', () => {
  it('formatINR uses en-IN grouping', () => {
    expect(formatINR(35000)).toBe('₹35,000');
    expect(formatINR(1250000)).toBe('₹12,50,000');
  });

  it('withGst adds 18%', () => {
    expect(withGst(35000)).toBe(41300);
    expect(withGst(35000, 0.05)).toBe(36750);
  });

  it('getService and getTier look up by id', () => {
    expect(getService('apps')!.name).toBe('Apps');
    expect(getService('nope')).toBeUndefined();
    expect(getTier('websites-launch')!.service.id).toBe('websites');
    expect(getTier('nope-launch')).toBeUndefined();
  });

  it('tierFromPrice prefers price, then from, then null', () => {
    const priced = tiers.find((t) => t.price !== null)!;
    const quoted = tiers.find((t) => t.price === null)!;
    expect(tierFromPrice(priced)).toBe(priced.price);
    expect(tierFromPrice(quoted)).toBe(quoted.from);
    expect(
      tierFromPrice({ id: 'x', name: 'x', label: 'x', tagline: 'x', price: null, buyable: false, includes: [] }),
    ).toBeNull();
  });
});
