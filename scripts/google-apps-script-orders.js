/**
 * Tech Pravaha orders: Google Apps Script web app that appends one paid order per call to a Sheet.
 * Called only by the techpravaha-api Worker (src/sheets.ts) after a verified Razorpay payment.
 * This file is pasted into Apps Script by hand; it is not part of the site build.
 *
 * Setup
 * 1. Create a Google Sheet named "TP Orders". Row 1 headers, in this order:
 *    Timestamp | Order id | Payment id | Service | Tier | Price ex-GST | GST | Total | Name | Email |
 *    Phone | Company | GSTIN | Page | Status | Deposit | Balance due at launch
 *    Price, GST and Total are the full order. Deposit is what was charged at checkout (equal to Total
 *    for a tier paid in full); Balance due at launch is Total minus Deposit (0 when paid in full).
 *    An existing Sheet made with the first 15 headers: add the last two headers at the end.
 * 2. In that Sheet: Extensions > Apps Script. Replace Code.gs with this file and save.
 * 3. Project Settings > Script Properties > Add property:
 *    TP_ORDERS_TOKEN = a long random string (e.g. `openssl rand -hex 32`).
 * 4. Deploy > New deployment > type "Web app":
 *    Execute as: Me. Who has access: Anyone (anyone with the link; no Google sign-in).
 *    Authorise when asked, then copy the /exec URL.
 * 5. On the Worker:
 *    npx wrangler secret put SHEETS_WEBHOOK_URL    (the /exec URL)
 *    npx wrangler secret put SHEETS_WEBHOOK_TOKEN  (the same value as TP_ORDERS_TOKEN)
 * 6. After editing this script, use Deploy > Manage deployments > Edit > New version, so the
 *    /exec URL stays the same.
 *
 * Contract: POST JSON { token, row }. Reply JSON { ok: true } after appending, { ok: false } otherwise
 * (wrong token, bad JSON, bad row) with nothing appended. The reply never says why it refused.
 */

var MAX_CELLS = 30;
var MAX_CELL_CHARS = 1000;

function doPost(e) {
  var ok = false;
  try {
    var data = JSON.parse(e && e.postData ? e.postData.contents : '');
    var expected = PropertiesService.getScriptProperties().getProperty('TP_ORDERS_TOKEN');
    if (
      expected &&
      data &&
      typeof data.token === 'string' &&
      safeEqual_(data.token, expected) &&
      Array.isArray(data.row) &&
      data.row.length > 0 &&
      data.row.length <= MAX_CELLS
    ) {
      SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow(data.row.map(cell_));
      ok = true;
    }
  } catch (err) {
    ok = false;
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: ok })).setMimeType(ContentService.MimeType.JSON);
}

/** Numbers pass through; strings are capped and formula-escaped (the Worker escapes too); anything else is blank. */
function cell_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v !== 'string') return '';
  var s = v.slice(0, MAX_CELL_CHARS);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Compare without exiting early on the first differing character. */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
