import catalogue from '../../../../catalogue.json';

/**
 * Expected amounts for a buyable tier, computed from catalogue.json in the test itself (whole rupees
 * with GST, then the deposit share), so a price edit needs no test change.
 */
export function expected(tierId: string): { price: number; totalPaise: number; amountPaise: number; balancePaise: number } {
  const tier = catalogue.services.flatMap((s) => s.tiers as { id: string; price: number | null; depositPct?: number }[]).find((t) => t.id === tierId);
  if (!tier || tier.price === null) throw new Error(`no priced tier ${tierId}`);
  const total = Math.round(tier.price * (1 + catalogue.gst));
  const charged = Math.round((total * (tier.depositPct ?? 100)) / 100);
  return { price: tier.price, totalPaise: total * 100, amountPaise: charged * 100, balancePaise: (total - charged) * 100 };
}
