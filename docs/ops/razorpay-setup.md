# Commerce setup: Razorpay, Cloudflare Worker, Resend, Orders Sheet

How to take `workers/techpravaha-api` from the repo to taking real payments. Do everything in Razorpay **test mode** first; switch to live keys only after KYC is approved.

## Go-live order

Work through the sections below in this order (the README and the phase 2 plan's morning notes carry the same list):

1. Razorpay, test mode (section 1): test keys, the test webhook, auto-capture, and the account's registered website includes `techpravaha.com`. If the account is shared with ATS, every ATS payment will also raise a "Payment for unknown order" alert: webhooks are account-wide.
2. Resend (section 3).
3. Apps Script (section 4).
4. Cloudflare (section 2): KV, the six secrets with the **test** keys, Workers Logs on, deploy, the route, the WAF rule, and a Workers plan whose KV write allowance covers the traffic (Free allows 1,000 writes a day; every order and every payment writes).
5. Growth decision: the four Growth tiers charge a 50% deposit (`"depositPct": 50` in `catalogue.json`). Keep it, or remove it and change the "50% at checkout" copy to take full payment.
6. Test-mode walkthrough (section 5) on a Pages **preview**: the test key in the Pages Preview environment only, and the preview origin added to `ALLOWED_ORIGINS` for the walkthrough, removed after.
7. After KYC: live keys and the live webhook secret on the Worker, then the ₹1 Payment Link check (section 7).
8. Production Pages environment with the live key (`VITE_RAZORPAY_KEY_ID=rzp_live_...`), then redeploy the site.
9. Optional: buy the cheapest tier for real and refund it. Then announce.

Flow being configured: site `/checkout/<tierId>` calls `POST https://api.techpravaha.com/orders` (amount comes from `catalogue.json`: the GST-inclusive total, or the deposit share for a tier with `depositPct`), Razorpay Checkout takes the payment, Razorpay calls `POST https://api.techpravaha.com/webhooks/razorpay`, the Worker marks the order paid in KV, appends a row to the Orders Sheet and emails the receipt via Resend. `/thanks` polls `GET /orders/<id>/status`.

## 0. Toolchain

- wrangler 4 needs **Node 22**. The Worker directory carries `.nvmrc` = `22`, so `cd workers/techpravaha-api && nvm use` picks it up. With Homebrew instead: `export PATH=/opt/homebrew/opt/node@22/bin:$PATH`.
- `npm --prefix workers/techpravaha-api ci` once, then `npm --prefix workers/techpravaha-api test` must be green before any deploy.
- `npx wrangler login` once per machine.

## 1. Razorpay dashboard (test mode)

1. Switch the dashboard to **Test Mode** (toggle at the top).
2. **Account & Settings > API Keys > Generate Test Key.** Note the Key Id (`rzp_test_...`) and Key Secret. The secret is shown once.
3. **Account & Settings > Webhooks > Add New Webhook:**
   - Webhook URL: `https://api.techpravaha.com/webhooks/razorpay`
   - Secret: a fresh random string (`openssl rand -hex 32`). This is `RAZORPAY_WEBHOOK_SECRET`; it is not the Key Secret.
   - Alert email: `yogesh@appropriatetechsolutions.com`
   - Active events: **`payment.captured` only.** Other events are acknowledged and ignored by the Worker, so ticking more only adds noise.
4. Make sure payments are **auto-captured** (Account & Settings > Payment capture). The Worker only acts on `payment.captured`; an authorised but uncaptured payment never confirms the order.

Test and live mode have separate keys **and separate webhooks**. Repeat steps 2 and 3 in live mode when going live (section 7).

## 2. Cloudflare

1. **KV namespace** (stores orders; unpaid orders expire after 7 days, paid ones are kept):
   ```sh
   cd workers/techpravaha-api
   npx wrangler kv namespace create techpravaha-orders
   npx wrangler kv namespace create techpravaha-orders --preview
   ```
   Paste the two ids into `wrangler.toml` (`id` and `preview_id` under `[[kv_namespaces]]`, binding stays `ORDERS`).
2. **Secrets** (six; each command prompts for the value, nothing goes in git):
   ```sh
   npx wrangler secret put RAZORPAY_KEY_ID          # rzp_test_... (public, but kept with its secret)
   npx wrangler secret put RAZORPAY_KEY_SECRET
   npx wrangler secret put RAZORPAY_WEBHOOK_SECRET  # the webhook secret from section 1 step 3
   npx wrangler secret put RESEND_API_KEY           # section 3
   npx wrangler secret put SHEETS_WEBHOOK_URL       # Apps Script /exec URL, section 4
   npx wrangler secret put SHEETS_WEBHOOK_TOKEN     # same value as the TP_ORDERS_TOKEN script property
   ```
   `npx wrangler secret list` should then show all six.
3. **`[vars]`** in `wrangler.toml` (not secret, committed):
   - `ALLOWED_ORIGINS`: the site origins allowed to call the API (CORS). Exact origins only: for the test walkthrough on a Pages preview, add that preview's origin (for example `https://<branch>.<project>.pages.dev`), redeploy, and remove it afterwards.
   - `FROM_EMAIL`: `Tech Pravaha <hello@techpravaha.com>`; must be on the Resend-verified domain.
   - `ALERT_EMAIL`: where failure alerts go.
   - `BOOKING_URL` (optional): absolute `https://` kickoff booking link for the receipt. Unset, or not https, means the receipt says "We will send you a kickoff slot within one working day".
   - `WHATSAPP_NUMBER` (optional): digits with country code, e.g. `919876543210`. Unset or a placeholder means no WhatsApp line in the receipt.
4. **Route.** With `techpravaha.com` on Cloudflare, uncomment the `routes = [...]` line near the top of `wrangler.toml` (`api.techpravaha.com/*`). Keep it above the `[[kv_namespaces]]` and `[vars]` tables or TOML reads it as part of them. Add a proxied DNS record for `api` if Cloudflare does not create one.
5. **Deploy and smoke test:**
   ```sh
   npm run worker:deploy
   curl https://api.techpravaha.com/health          # {"ok":true,"version":"..."}
   npx wrangler tail                                # live logs while testing
   ```
6. **Redeploys.** The Worker bundles `catalogue.json` and the chat facts at deploy time; `npm run worker:deploy` regenerates the chat facts (`npm run prompt:data`) before it deploys. `.github/workflows/deploy-worker.yml` redeploys it on every push to `main` that touches `catalogue.json` or `workers/**`. It needs two GitHub repo secrets (Settings > Secrets and variables > Actions): `CLOUDFLARE_API_TOKEN` (a token from the "Edit Cloudflare Workers" template, scoped to this account) and `CLOUDFLARE_ACCOUNT_ID`. Until then, run `npm run worker:deploy` on Node 22 after every price change: checkout refuses an order whose amount differs from the page, so a stale Worker blocks the sale rather than charging the wrong amount.

### Rate limit `/orders` (WAF)

Every `POST /orders` creates a Razorpay order, so cap it. **Security > WAF > Rate limiting rules > Create rule:**

- If incoming requests match: Hostname equals `api.techpravaha.com` AND URI Path equals `/orders` AND Request Method equals `POST`
- Rate: **10 requests per 1 minute**, counted per IP
- Action: Block (or Managed Challenge) for 1 minute

If the plan only offers a 10 second period, use 2 requests per 10 seconds. Do **not** rate-limit `/webhooks/razorpay`: Razorpay retries from a small set of IPs and a block there delays order confirmation.

### Rate limit `/chat` (Workers Rate Limiting binding)

`POST /chat` (the site chatbot, a Gemini call per message) is limited inside the Worker by the `CHAT_RATE` binding in `wrangler.toml` (`[[ratelimits]]`, 12 requests per 60 seconds per IP, keyed on `CF-Connecting-IP`). Over the limit the Worker answers 429 with a friendly reply; if the binding itself errors, the message is allowed through. Nothing to create in the dashboard: `namespace_id` is a number we pick, and the binding deploys with the Worker.

- **Per location and approximate.** Counters live in each Cloudflare location and are not synchronised, so a visitor whose requests reach two locations can get more than 12 a minute, and the count can lag slightly. Fine for abuse control; it is not a hard cap on Gemini spend.
- **No KV writes.** It does not touch the KV write allowance (the orders flow is the only KV writer).
- **Spend backstop.** Because the limit is approximate, set a budget or spend cap on the Google Cloud project that owns `GEMINI_API_KEY`.

## 3. Resend

1. **Domains > Add Domain** `techpravaha.com` (region closest to India is fine).
2. Add the DNS records Resend shows (SPF and DKIM TXT records, plus the MX record on the `send` subdomain) in Cloudflare DNS, set to **DNS only** (grey cloud). Click Verify; wait for all records to go green.
3. **API Keys > Create**: permission "Sending access", restricted to `techpravaha.com`. That value is `RESEND_API_KEY`.
4. Receipts go out with `reply_to: hello@techpravaha.com`, so that mailbox must exist and be read.
5. Optional: add a DMARC record (`_dmarc` TXT, start with `p=none`) to help Gmail deliverability.

## 4. Orders Sheet (Apps Script web app)

Full steps are in the header of `scripts/google-apps-script-orders.js`. In short:

1. New Google Sheet "TP Orders" with the 17 header columns listed in the script header.
2. Extensions > Apps Script, paste the script, save.
3. Project Settings > Script Properties: `TP_ORDERS_TOKEN` = a long random string.
4. Deploy > New deployment > **Web app**: Execute as **Me**, Who has access **Anyone** (anyone with the link). Copy the `/exec` URL.
5. `wrangler secret put SHEETS_WEBHOOK_URL` (the URL) and `SHEETS_WEBHOOK_TOKEN` (the token).

Check it by hand (should append a row and print `{"ok":true}`; delete the row afterwards). Do not add `-X POST`: `-d` already makes it a POST, and without `-X` curl follows Apps Script's 302 with a GET, as it must:

```sh
curl -sL -H 'Content-Type: application/json' \
  -d '{"token":"<TP_ORDERS_TOKEN>","row":["test","order_test"]}' '<exec URL>'
```

The same script and URL also take leads: the Worker's `POST /leads` sends `type: "lead"`, which lands in a "Leads" tab (created on the first lead, with its header row: Timestamp, Type, Name, Email, Phone, Message, Page, Tier, Order, URL). Orders go to the tab named "Orders", or the first tab if none has that name. Deploy the updated script (New version) before the Worker that sends leads: an older script ignores `type` and would put lead rows in the first tab. The site no longer has a leads Apps Script URL; leads reach the Sheet only through the Worker. Check a lead by hand with `"type":"lead","row":["test","contact","Test","t@example.com"]` in the body above.

A wrong token prints `{"ok":false}` and appends nothing. An HTML page instead of JSON means the deployment access is not "Anyone"; the Worker treats that as a failure and alerts.

Every string cell starting with `=`, `+`, `-`, `@`, tab or carriage return is stored with a leading `'`, so a customer cannot plant a formula. Phone numbers therefore show as text (`+91...`), which is what we want.

## 5. Test payments (test mode)

Use a Pages **preview** against the deployed Worker, with `VITE_RAZORPAY_KEY_ID=rzp_test_...` set in the Pages Preview environment only and the preview origin in `ALLOWED_ORIGINS`. Buy a Launch tier by card and a Growth tier by UPI:

- **Card:** `4111 1111 1111 1111`, any future expiry, any CVV. On the test bank page choose Success.
- **UPI:** VPA `success@razorpay` succeeds; `failure@razorpay` fails.

Once, open the Razorpay window, close it without paying, then press Pay again and pay: Razorpay must reuse the same order (one order in the dashboard) and confirm normally.

Then check, in order:

1. `/thanks` turns to "confirmed", usually within a minute and up to two (KV takes time to reach every Cloudflare location). After 30 s it shows the pending copy and keeps checking; a late "paid" still switches it to confirmed.
2. `GET https://api.techpravaha.com/orders/<order id>/status` returns `"status":"paid"`.
3. One new row in the Orders Sheet. For the Growth tier the last two columns show the deposit and the balance due at launch.
4. One receipt email at the address used, with the intake form link, the kickoff line and the GST invoice note. For the Growth tier it lists the total, "Deposit paid (50%)" and "Balance due at launch".
5. No alert email at `ALERT_EMAIL`.
6. `npx wrangler tail` shows no errors. Razorpay redelivering the same event (retries happen) must not add a second row or email; the Worker answers `{"ok":true,"duplicate":true}`.

A failed test payment must leave the order at `created` and send nothing.

Afterwards, remove the preview origin from `ALLOWED_ORIGINS`, redeploy the Worker, and delete the test rows from the Orders Sheet (test rows only; see section 7 for paid rows).

## 6. Alerts and what to do

All alerts come from the Worker via Resend to `ALERT_EMAIL`. None contain customer details; look the order up in the Razorpay dashboard.

| Subject | Meaning | Action |
| --- | --- | --- |
| `Order <id>: sheet append failed` | Paid, receipt attempted, Sheet row missing | Add the row by hand from the Razorpay payment |
| `Order <id>: receipt email failed` | Paid, Sheet row written, customer got no email | Email the customer the receipt and intake link |
| `Payment for unknown order <id>` | Captured payment for an order not in KV (unpaid order older than 7 days, or a Payment Link) | Fulfil by hand or refund |
| `Order <id>: amount mismatch` | Captured amount differs from the catalogue amount stored with the order | Check the dashboard; refund or collect the difference |
| `Order <id>: second payment captured` | The customer paid the same order twice | Refund the second payment |
| `Order <id>: paid, side effects not run` | The payment was recorded (payment index written) but processing stopped (KV error) before the Sheet row and receipt. A retry would be deduplicated, so nothing will redo them | Add the row and send the receipt by hand |
| `Order <id>: store error, Razorpay will retry` | KV failed before the payment was recorded; the webhook answered 500, so Razorpay retries. A retry either runs the side effects (Sheet row and receipt) or sends a "check receipt and Sheet row" alert | Act on that alert, or if nothing appears within about an hour, check the Sheet and the sent mail and send whatever is missing |
| `Order <id>: check receipt and Sheet row` | A redelivery found the order paid but the payment not indexed (an earlier delivery stopped halfway, or two raced) | Check the Sheet and the sent mail; send whatever is missing |
| `Lead sheet append failed` | A contact or teardown lead was accepted (the visitor saw "sent") but the Leads tab append failed. The lead is not stored anywhere else: only the Telegram lead ping (name, email, page, and the site URL for a teardown) is left, and only if Telegram is configured. The message and phone are lost | Find the Telegram ping and ask the visitor again for what they sent |

Lead pings need Telegram (`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`). Without it, lead pings are skipped, never emailed: `/leads` is open to anyone, and an email per lead would let anyone drain the Resend quota that receipts and these alerts depend on. The Leads tab is the record of every lead. Order pings fall back to `ALERT_EMAIL` when Telegram is unset.

If Resend itself is down the alert cannot be sent; it is logged instead (`npx wrangler tail`, or Workers Logs in the dashboard, which keeps logs only once Workers Logs is turned on). A KV outage before the payment is recorded makes the webhook answer 500 so Razorpay retries later.

## 7. Going live and the ₹1 live check

After KYC approval:

1. Switch the dashboard to Live Mode, generate live API keys, add the **live** webhook (same URL, new secret, `payment.captured`).
2. `wrangler secret put` the live `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; redeploy. Set the site's `VITE_RAZORPAY_KEY_ID=rzp_live_...` and rebuild.
3. **₹1 live check, before announcing.** Prices come only from `catalogue.json`, so the site cannot sell a ₹1 order (deliberately). Instead, in Live Mode create a **Payment Link for ₹1** and pay it with your own UPI. Expect, within a minute: an alert `Payment for unknown order order_...` (or `payment.captured without usable ids`). That proves the live webhook secret, the route, KV and Resend all work end to end. Refund the ₹1 from the dashboard.
4. Optionally buy the cheapest tier once for real and refund it, to see the live receipt and Sheet row (Razorpay keeps its fee on refunds).
5. Never edit or delete rows in the Orders Sheet for paid orders; they are the order log alongside Razorpay.

## 8. Deleting a customer's data

The privacy page promises deletion from the Sheets, the inbox and the order records in KV. For a deletion request (keep what tax law requires, such as the invoice):

1. Find the order id and payment id in the Orders Sheet or the Razorpay dashboard (search by the customer's email).
2. Delete the KV records, from `workers/techpravaha-api` on Node 22:
   ```sh
   npx wrangler kv key delete --binding ORDERS --remote "order:<order id>"
   npx wrangler kv key delete --binding ORDERS --remote "payment:<payment id>"
   ```
   The `payment:` key holds only the order id, but delete it too so nothing points at the order.
3. Delete the customer's row in the Orders Sheet and any rows in the leads Sheet.
4. Delete their emails from the inbox (`hello@techpravaha.com`) and the alerts mailbox, including the sent receipt.
5. Confirm the deletion to the customer by email.
