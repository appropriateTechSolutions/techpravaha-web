/**
 * Tech Pravaha Sheet intake: Google Apps Script web app that appends one row per call to a Sheet.
 * Called only by the techpravaha-api Worker (src/sheets.ts): a paid order after a verified Razorpay
 * payment (type "order", "Orders" tab) and a contact or lead-magnet submission (type "lead", "Leads" tab).
 * This file is pasted into Apps Script by hand; it is not part of the site build.
 *
 * Setup
 * 1. Create a Google Sheet named "TP Orders". Row 1 headers, in this order:
 *    Timestamp | Order id | Payment id | Service | Tier | Price ex-GST | GST | Total | Name | Email |
 *    Phone | Company | GSTIN | Page | Status | Deposit | Balance due at launch
 *    Price, GST and Total are the full order. Deposit is what was charged at checkout (equal to Total
 *    for a tier paid in full); Balance due at launch is Total minus Deposit (0 when paid in full).
 *    An existing Sheet made with the first 15 headers: add the last two headers at the end.
 *    The Leads tab is created on the first lead if it does not exist, with its header row:
 *    Timestamp | Type | Name | Email | Phone | Message | Page | Tier | Order | URL
 *    (Type is contact or lead_magnet; Order is the Razorpay order id when the visitor came from /thanks.)
 *    Orders go to the tab named "Orders", or the first tab if none is named that (the original behaviour).
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
 *    /exec URL stays the same. Deploy this version BEFORE the Worker version that sends leads: an
 *    older script ignores `type` and would put lead rows in the first tab.
 *
 * Contract: POST JSON { token, type?, row }. `type` is "order" (default when absent) or "lead".
 * Reply JSON { ok: true } after appending, { ok: false } otherwise (wrong token, unknown type, bad
 * JSON, bad row) with nothing appended. The reply never says why it refused.
 */

var MAX_CELLS = 30;
var MAX_CELL_CHARS = 2100; // a lead message is up to 2,000 characters; escaping adds one, and there is headroom
var LEAD_HEADERS = ['Timestamp', 'Type', 'Name', 'Email', 'Phone', 'Message', 'Page', 'Tier', 'Order', 'URL'];

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
      var sheet = sheetFor_(data.type === undefined ? 'order' : data.type);
      if (sheet) {
        sheet.appendRow(data.row.map(cell_));
        ok = true;
      }
    }
  } catch (err) {
    ok = false;
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: ok })).setMimeType(ContentService.MimeType.JSON);
}

/** The tab for a row type, or null for an unknown type. Leads get their own tab, created on first use. */
function sheetFor_(type) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (type === 'order') return ss.getSheetByName('Orders') || ss.getSheets()[0];
  if (type === 'lead') {
    var leads = ss.getSheetByName('Leads');
    if (!leads) {
      try {
        leads = ss.insertSheet('Leads');
        leads.appendRow(LEAD_HEADERS);
      } catch (err) {
        // Two first leads at once: the other call created the tab between our check and our insert.
        leads = ss.getSheetByName('Leads');
        if (!leads) throw err;
      }
    }
    return leads;
  }
  return null;
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
