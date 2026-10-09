// Lead capture: POSTs to a Google Apps Script endpoint that appends a row to a
// private "TP Leads" sheet (same pattern as ats_website). The endpoint URL is
// public by design; it only accepts row inserts.

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Catalogue tier id from `?tier=`, when the visitor came from a package. */
  tier?: string;
  /** Path the form was sent from. */
  page: string;
  type: 'contact';
}

/** The script URL, or '' when unset or still the `.env.example` placeholder. Read per call so tests can stub it. */
function scriptUrl(): string {
  const raw = String(import.meta.env.VITE_LEADS_SCRIPT_URL ?? '').trim();
  return raw === '' || raw.includes('REPLACE') ? '' : raw;
}

/**
 * Sends a lead. `no-cors` gives an opaque response, so a resolved fetch counts
 * as sent; a network error or a missing URL resolves `{ ok: false }` and the
 * form falls back to WhatsApp.
 */
export async function submitLead(data: LeadData): Promise<{ ok: boolean }> {
  const url = scriptUrl();
  if (!url) return { ok: false };
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      // no-cors only allows "simple" content types; Apps Script parses e.postData.contents as JSON.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
