import { describe, expect, it } from 'vitest';
import { catalogue, chargedNow } from '../app/lib/catalogue';
// The Worker's catalogue module is plain TypeScript over the same catalogue.json, so it imports here directly.
import { priced } from '../workers/techpravaha-api/src/catalogue';

const buyable = catalogue.services.flatMap((s) => s.tiers).filter((t) => t.buyable);

describe('site and Worker charge the same amount', () => {
  it('covers at least one buyable tier', () => {
    expect(buyable.length).toBeGreaterThan(0);
  });

  it.each(buyable.map((t) => [t.id, t] as const))('%s: chargedNow * 100 === priced().amountPaise', (id, tier) => {
    const worker = priced(id);
    expect(worker, id).not.toBeNull();
    expect(chargedNow(tier as typeof tier & { price: number }) * 100).toBe(worker!.amountPaise);
  });
});
