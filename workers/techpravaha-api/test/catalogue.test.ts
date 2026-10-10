import { describe, expect, it } from 'vitest';
import { orderAmounts, priced } from '../src/catalogue';
import { expected } from './helpers/amounts';

const LAUNCH = expected('websites-launch');
const GROWTH = expected('websites-growth');

describe('priced', () => {
  it('computes paise from catalogue price plus GST', () => {
    const p = priced('websites-launch');
    expect(p).not.toBeNull();
    expect(p!.amountPaise).toBe(LAUNCH.totalPaise);
    expect(p!.gst).toBe(0.18);
    expect(p!.service.id).toBe('websites');
    expect(p!.tier).toMatchObject({ id: 'websites-launch', price: LAUNCH.price, weeks: 2 });
    expect(p!.totalPaise).toBe(LAUNCH.totalPaise);
    expect(p!.depositPct).toBe(100);
    expect(p!.balancePaise).toBe(0);
  });

  it('charges a 50% deposit, GST included, for a Growth tier (spec section 4)', () => {
    const p = priced('websites-growth')!;
    expect(p.amountPaise).toBe(GROWTH.amountPaise);
    expect(p.totalPaise).toBe(GROWTH.totalPaise);
    expect(p.depositPct).toBe(50);
    expect(p.balancePaise).toBe(GROWTH.balancePaise);
    for (const id of ['whatsapp-growth', 'content-growth', 'design-growth']) {
      const g = priced(id)!;
      expect(g.depositPct).toBe(50);
      expect(g.amountPaise + g.balancePaise).toBe(g.totalPaise);
      expect(g.amountPaise % 100).toBe(0);
    }
  });

  it('returns null for a quote-only tier', () => {
    expect(priced('apps-growth')).toBeNull();
    expect(priced('websites-bespoke')).toBeNull();
  });

  it('returns null for an unknown tier', () => {
    expect(priced('nope')).toBeNull();
  });
});

describe('orderAmounts', () => {
  it('treats a record without totalPaise or depositPct as paid in full', () => {
    expect(orderAmounts({ amountPaise: 4130000 })).toEqual({ charged: 41300, total: 41300, balance: 0, depositPct: 100 });
  });

  it('splits a deposit order into charged and balance', () => {
    expect(orderAmounts({ amountPaise: 5605000, totalPaise: 11210000, depositPct: 50 })).toEqual({
      charged: 56050,
      total: 112100,
      balance: 56050,
      depositPct: 50,
    });
  });
});
