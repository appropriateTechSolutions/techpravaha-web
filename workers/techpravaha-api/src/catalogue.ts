import catalogue from '../../../catalogue.json';

export interface Priced {
  service: { id: string; name: string };
  tier: { id: string; label: string; price: number; weeks?: number; days?: number; payment?: string };
  /** Charged at checkout, in paise: the deposit share of totalPaise (all of it when depositPct is 100). */
  amountPaise: number;
  /** Full order value in paise, GST included. */
  totalPaise: number;
  /** Share of the total charged at checkout, 1 to 100. Absent in the catalogue means 100. */
  depositPct: number;
  /** totalPaise minus amountPaise: due at launch. */
  balancePaise: number;
  gst: number;
}

interface RawTier {
  id: string;
  label: string;
  price: number | null;
  buyable?: boolean;
  weeks?: number;
  days?: number;
  payment?: string;
  depositPct?: number;
}

// Same rounding as the site's withGst: whole rupees, then paise.
const withGst = (price: number, gst: number): number => Math.round(price * (1 + gst));

const validPct = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100;

/**
 * Same rule as the site's chargedNow: whole rupees, so the amount Checkout shows and the amount
 * Razorpay charges are the same number.
 */
export const chargedNowRupees = (totalRupees: number, depositPct: number): number =>
  Math.round((totalRupees * depositPct) / 100);

export function priced(tierId: string): Priced | null {
  const gst = catalogue.gst;
  for (const service of catalogue.services) {
    for (const t of service.tiers as RawTier[]) {
      if (t.id !== tierId) continue;
      if (t.buyable !== true || t.price == null) return null;
      const depositPct = t.depositPct ?? 100;
      // The site build rejects a bad depositPct; refuse to sell rather than guess if one slips through.
      if (!validPct(depositPct)) return null;
      const tier: Priced['tier'] = { id: t.id, label: t.label, price: t.price };
      if (t.weeks !== undefined) tier.weeks = t.weeks;
      if (t.days !== undefined) tier.days = t.days;
      if (t.payment !== undefined) tier.payment = t.payment;
      const total = withGst(t.price, gst);
      const charged = chargedNowRupees(total, depositPct);
      return {
        service: { id: service.id, name: service.name },
        tier,
        amountPaise: charged * 100,
        totalPaise: total * 100,
        depositPct,
        balancePaise: (total - charged) * 100,
        gst,
      };
    }
  }
  return null;
}

/**
 * Split a stored GST-inclusive amount back into whole-rupee price, GST and total, using the GST
 * rate stored on the order (not today's catalogue rate).
 */
export function splitTotal(
  amountPaise: number,
  rate: number,
): { price: number; gst: number; total: number; rate: number } {
  const total = Math.round(amountPaise / 100);
  // total = round(price * (1 + rate)) for an integer price, so this division always recovers price exactly.
  const price = Math.round(total / (1 + rate));
  return { price, gst: total - price, total, rate };
}

/**
 * What an order record says was charged, the full total and the balance, in whole rupees.
 * Records written before deposits existed have no totalPaise/depositPct: they were paid in full.
 */
export function orderAmounts(o: { amountPaise: number; totalPaise?: number; depositPct?: number }): {
  charged: number;
  total: number;
  balance: number;
  depositPct: number;
} {
  const charged = Math.round(o.amountPaise / 100);
  const total = Math.round((o.totalPaise ?? o.amountPaise) / 100);
  return { charged, total, balance: total - charged, depositPct: o.depositPct ?? 100 };
}
