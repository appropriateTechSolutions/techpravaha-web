// Lead capture: POSTs JSON to the techpravaha-api Worker (`POST /leads`), which validates it,
// appends a row to the private Leads sheet and pings Yogesh. The Worker is the only lead path;
// the site holds no Sheet URL or secret.

import { request } from '../lib/api';

export interface LeadData {
  /** `contact` from the contact form, `lead_magnet` from the teardown form. */
  type: 'contact' | 'lead_magnet';
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Path the form was sent from. */
  page: string;
  /** Catalogue tier id from `?tier=`, when the visitor came from a package. */
  tier?: string;
  /** Razorpay order id from `?order=` (the /thanks intake link), sent as its own field. */
  order?: string;
  /** The visitor's site, for the teardown. */
  url?: string;
}

/**
 * Sends a lead. Resolves `{ ok: true }` only on 202, the Worker's accept. A network error,
 * timeout, validation refusal, rate limit or server error resolves `{ ok: false }` and the
 * form shows the WhatsApp/email fallback; it never throws.
 */
export async function submitLead(data: LeadData): Promise<{ ok: boolean }> {
  try {
    const { res } = await request(
      '/leads',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) },
      15_000,
    );
    return { ok: res.status === 202 };
  } catch {
    return { ok: false };
  }
}
