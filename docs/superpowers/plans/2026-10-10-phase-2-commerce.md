# Tech Pravaha — Phase 2 (Commerce) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor buy a fixed-price tier with Razorpay on techpravaha.com and land in a verified post-purchase flow: order row in a Google Sheet, receipt + intake + kickoff-booking email, and a `/thanks` page that only says "confirmed" once the webhook has run.

**Architecture:** A Cloudflare Worker (`workers/techpravaha-api`, TypeScript, Hono-free plain `fetch` handler) owns every secret: it creates Razorpay Orders from `catalogue.json` (the client never sends a price), verifies the webhook HMAC, is idempotent on `payment_id`, appends to a Sheet via Apps Script, sends email via Resend, and exposes `GET /orders/:id/status`. The site gets `/checkout/:tierId` (prerendered page that loads Razorpay Checkout.js on demand) and `/thanks`. `TierCard` CTAs switch from WhatsApp to `/checkout/<tierId>` for buyable tiers; quote tiers keep `/contact?tier=`.

**Tech Stack:** Cloudflare Workers (wrangler ^4), TypeScript, Web Crypto (HMAC-SHA256), Razorpay Orders API + Checkout.js + Webhooks, Resend API, Google Apps Script web app (Sheet append), Vitest with `@cloudflare/vitest-pool-workers` or plain unit tests over pure functions (chosen: pure functions + `fetch` mocks; no pool), Playwright e2e in Razorpay test mode (manual step).

**Spec:** `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md` §4–§6.

## Global Constraints

- All of phase 1's Global Constraints apply (tokens only, no em-dashes, `m.*`, catalogue is the price source, scripts use fs).
- The amount charged is computed in the Worker from `catalogue.json` (`withGst(tier.price)` × `depositPct`/100, in paise; Growth tiers carry `depositPct: 50` per spec §4); the client sends only `tierId` + customer fields.
- Secrets live only in Worker secrets (`wrangler secret put`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SHEETS_WEBHOOK_URL`, `SHEETS_WEBHOOK_TOKEN`. `.env.example` and `workers/techpravaha-api/.dev.vars.example` carry dummies. The site needs only `VITE_API_URL` (default `https://api.techpravaha.com`) and `VITE_RAZORPAY_KEY_ID` (public key id).
- Webhook handling is idempotent on `payment.entity.id`; signature failures return 400 and log nothing sensitive; Sheet/email failures never cause a non-2xx to Razorpay after the signature is verified (log + alert email instead), so Razorpay does not retry forever.
- The `/thanks` page never claims "confirmed" before `GET /orders/:id/status` returns `paid`; after 30 s of polling it says the receipt is on its way.
- Razorpay test mode first; live keys only after Yogesh's KYC (morning note). One real ₹1 live transaction before announcing (manual).
- Commit per task on `feat/phase-2-commerce` (controller squashes at the end). Never push.

## Review Focus

1. A tampered request (`tierId` of a quote-only tier, or an `amount` field) → Worker refuses with 400; never creates an order (Task 2 test).
2. Webhook replay (same `payment_id` twice) → second call returns 200 and performs no side effects (Task 3 test).
3. Wrong/missing `X-Razorpay-Signature` → 400, no side effects (Task 3 test).
4. Resend or Sheets down after a valid webhook → still 200 to Razorpay, order marked `paid` in KV, alert email attempted, error logged (Task 3 test).
5. Checkout.js fails to load (blocked script) → the checkout page shows a WhatsApp fallback with the tier named; the Buy button never spins forever (Task 5 test).

---

## File structure

```
workers/techpravaha-api/
  wrangler.toml  package.json  tsconfig.json  .dev.vars.example
  src/index.ts          # router: POST /orders, POST /webhooks/razorpay, GET /orders/:id/status, GET /health
  src/catalogue.ts      # imports ../../../catalogue.json; amountPaise(tierId) → {amount, tier, service} | null
  src/razorpay.ts       # createOrder(env, amount, receipt, notes), verifyWebhookSignature(secret, body, sig)
  src/orders.ts         # KV-backed order store: put/get/markPaid (idempotent)
  src/sheets.ts         # appendOrderRow(env, order)
  src/email.ts          # sendReceipt(env, order), sendAlert(env, message)
  src/cors.ts
  test/*.test.ts        # vitest, pure functions + fetch mocks
app/routes/checkout.$tierId.tsx   app/routes/thanks.tsx
app/components/CheckoutForm.tsx   app/lib/api.ts (createOrder, orderStatus)   app/lib/razorpay.ts (loadCheckout)
scripts/lib/paths.ts   # add /checkout/<tierId> for buyable tiers + /thanks (noindex)
app/components/TierCard.tsx       # cta='checkout' default for buyable tiers
docs/ops/razorpay-setup.md        # dashboard steps: webhook URL, events, secrets, test cards
```

---

### Task 1: Worker scaffold, catalogue amounts, health

**Files:** Create `workers/techpravaha-api/{wrangler.toml,package.json,tsconfig.json,.dev.vars.example,src/index.ts,src/catalogue.ts,src/cors.ts,test/catalogue.test.ts}`; modify root `package.json` scripts (`"worker:dev": "npm --prefix workers/techpravaha-api run dev"`, `"worker:test"`, `"worker:deploy"`), `.gitignore` (`.dev.vars`, `.wrangler`).

**Produces:**
```ts
// src/catalogue.ts
export interface Priced { service: { id: string; name: string }; tier: { id: string; label: string; price: number; weeks?: number; days?: number; payment?: string }; amountPaise: number /* withGst(price)*100 */; gst: number }
export function priced(tierId: string): Priced | null;   // null for unknown or non-buyable tiers
// src/cors.ts
export function cors(origin: string | null, allowed: string[]): HeadersInit; export function preflight(req: Request, allowed: string[]): Response | null;
// src/index.ts  export default { fetch(req, env, ctx) }  — routes above; GET /health → { ok: true, version }
// Env interface: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RESEND_API_KEY, SHEETS_WEBHOOK_URL, SHEETS_WEBHOOK_TOKEN, ALLOWED_ORIGINS (csv), ALERT_EMAIL, FROM_EMAIL, ORDERS: KVNamespace
```

- [ ] Step 1: `cd workers/techpravaha-api && npm init -y && npm i -D wrangler typescript vitest @cloudflare/workers-types`. `wrangler.toml`: `name = "techpravaha-api"`, `main = "src/index.ts"`, `compatibility_date = "2026-10-01"`, `[[kv_namespaces]] binding = "ORDERS", id = "REPLACE"` (+ `preview_id`), `[vars] ALLOWED_ORIGINS = "https://techpravaha.com,https://www.techpravaha.com,http://localhost:3000"`, `FROM_EMAIL = "Tech Pravaha <hello@techpravaha.com>"`, `ALERT_EMAIL = "yogesh@appropriatetechsolutions.com"`; routes commented: `api.techpravaha.com/*`.
- [ ] Step 2: Tests first: `priced('websites-launch').amountPaise === 4130000`; `priced('apps-growth') === null` (quote-only); `priced('nope') === null`. GST from `catalogue.gst`; rounding `Math.round(price * (1+gst)) * 100`.
- [ ] Step 3: Implement; `index.ts` with a tiny matcher (`url.pathname` switch + regex for `/orders/:id/status`), JSON helpers, CORS from `ALLOWED_ORIGINS`, `GET /health`.
- [ ] Step 4: `npm --prefix workers/techpravaha-api test` and `npx wrangler dev --local` boots (curl `/health`).

### Task 2: Create order endpoint (Razorpay Orders API)

**Files:** Create `src/razorpay.ts`, `src/orders.ts`, `test/orders.test.ts`, `test/razorpay.test.ts`; modify `src/index.ts`.

**Produces:**
```ts
// src/razorpay.ts
export async function createOrder(env, input: { amountPaise: number; receipt: string; notes: Record<string,string> }, fetchImpl = fetch): Promise<{ id: string; amount: number; currency: 'INR' }>; // POST https://api.razorpay.com/v1/orders with Basic auth key:secret
export async function verifyWebhookSignature(secret: string, rawBody: string, signature: string | null): Promise<boolean>; // HMAC-SHA256 hex, constant-time compare
// src/orders.ts
export interface OrderRecord { id: string /* rzp order id */; tierId: string; serviceName: string; tierLabel: string; amountPaise: number; customer: { name: string; email: string; phone: string; gstin?: string; company?: string }; status: 'created'|'paid'; paymentId?: string; createdAt: string; paidAt?: string; page?: string }
export async function putOrder(kv, o: OrderRecord): Promise<void>; export async function getOrder(kv, id): Promise<OrderRecord|null>;
export async function markPaid(kv, id, paymentId): Promise<'updated'|'already'|'missing'>;   // idempotent
// POST /orders  body { tierId, customer:{name,email,phone,gstin?,company?}, page? } → 200 { orderId, amount, currency, keyId, tier:{label}, service:{name} } | 400 { error }
```

- [ ] Step 1: Tests: `POST /orders` with `tierId:'apps-growth'` → 400 `quote-only`; with an extra `amount` field → 400 `unexpected field`; invalid email/phone (10-digit Indian mobile, optional +91) → 400 with field names; happy path mocks `fetch` to Razorpay returning `{ id:'order_x', amount, currency:'INR' }` and asserts the stored `OrderRecord` has `amountPaise` from the catalogue (never from the body), the response carries `keyId = env.RAZORPAY_KEY_ID`, and the Razorpay request used Basic auth + the catalogue amount. `verifyWebhookSignature` true/false for a known vector (compute expected with Node crypto in the test).
- [ ] Step 2: Implement (`crypto.subtle.importKey('raw', …, {name:'HMAC', hash:'SHA-256'})`; constant-time compare over equal-length hex).
- [ ] Step 3: Worker tests green.

### Task 3: Webhook, Sheet append, receipt email, status endpoint

**Files:** Create `src/sheets.ts`, `src/email.ts`, `test/webhook.test.ts`, `test/email.test.ts`; modify `src/index.ts`; create `scripts/google-apps-script-orders.js` (Apps Script `doPost` that checks a shared token and appends a row: timestamp, orderId, paymentId, tier, service, amount ex-GST, GST, total, name, email, phone, company, GSTIN, page, status).

**Produces:**
```ts
export async function appendOrderRow(env, o: OrderRecord, fetchImpl = fetch): Promise<void>;   // POST SHEETS_WEBHOOK_URL with { token, row }
export async function sendReceipt(env, o: OrderRecord, fetchImpl = fetch): Promise<void>;        // Resend: subject "Your Tech Pravaha order <orderId>" — summary (tier, service, amount, GST, total, Razorpay payment id), next steps (intake form link = https://techpravaha.com/contact?order=<id>&tier=<tierId>; kickoff booking = env.BOOKING_URL or "we will send a slot"), GST invoice note ("A GST invoice follows within one working day")
export async function sendAlert(env, subject: string, body: string, fetchImpl = fetch): Promise<void>;
// POST /webhooks/razorpay: raw body → verify signature → parse → only event 'payment.captured' (ack others 200) → order id from payload.payment.entity.order_id → markPaid → if 'updated': ctx.waitUntil(appendOrderRow + sendReceipt; on failure sendAlert) → 200 { ok:true }
// GET /orders/:id/status → 200 { status:'created'|'paid', tier, service, amountPaise } | 404
```

- [ ] Step 1: Tests (fetch mocked): bad signature → 400 and no KV change; valid `payment.captured` for a `created` order → `markPaid` 'updated', Sheet POST + Resend POST made once; replay of the same payload → 200, no second Sheet/Resend call; Sheet POST rejects → still 200, Resend alert called; unknown order id → 200 (ack) + alert; `GET /orders/order_x/status` reflects `paid` afterwards.
- [ ] Step 2: Implement; email in plain text + minimal HTML; no em-dashes in copy.
- [ ] Step 3: Worker tests green; `docs/ops/razorpay-setup.md` written: dashboard → Webhooks → URL `https://api.techpravaha.com/webhooks/razorpay`, events `payment.captured`, secret; `wrangler secret put` list; KV namespace creation; test cards/UPI in test mode; the ₹1 live check.

### Task 4: Site API client + Checkout page + Thanks page

**Files:** Create `app/lib/api.ts`, `app/lib/razorpay.ts`, `app/components/CheckoutForm.tsx`, `app/routes/checkout.$tierId.tsx`, `app/routes/thanks.tsx`; modify `app/routes.ts`, `scripts/lib/paths.ts` (buyable `/checkout/<tierId>` paths + `/thanks`; both in `NOINDEX_PATHS`), `.env.example` (`VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`); tests `tests/checkout.test.tsx`, `tests/thanks.test.tsx`.

**Produces:**
```ts
// app/lib/api.ts
export async function createOrder(input: { tierId: string; customer: Customer; page: string }): Promise<CreateOrderResponse>;  // POST ${VITE_API_URL}/orders
export async function orderStatus(orderId: string): Promise<{ status: 'created'|'paid' } | null>;
// app/lib/razorpay.ts
export function loadCheckout(): Promise<RazorpayCtor>;  // injects https://checkout.razorpay.com/v1/checkout.js once; rejects after 8 s
// routes
/checkout/:tierId — prerendered for buyable tiers; 404 otherwise. Summary card (service, tier label, includes, price ex-GST, GST, total via withGst), customer form (name, email, phone, company?, GSTIN? with format check), "Pay ₹<total>" button → createOrder → loadCheckout → new Razorpay({ key, amount, currency, order_id, name:'Tech Pravaha', description, prefill, theme:{ color: '#0A0A0C' }, handler: () => navigate('/thanks?order=<id>'), modal:{ ondismiss } }).open(); errors → inline message + WhatsAppCta("Hi Tech Pravaha, I tried to buy <service · tier> and checkout failed."). Track: begin_checkout on submit, purchase (value = total) on handler.
/thanks?order=… — polls orderStatus every 2 s up to 30 s; states: checking → confirmed (receipt, intake link, booking) → pending ("Payment received by Razorpay; your receipt is on its way. If it does not arrive in 10 minutes, WhatsApp us."); no order param → generic thanks. noindex.
```

- [ ] Step 1: Tests: checkout page for `websites-launch` shows the total `₹41,300`; submitting with an invalid GSTIN shows a message; `loadCheckout` rejection shows the WhatsApp fallback and re-enables the button; `/thanks?order=x` shows "confirmed" only after a mocked `orderStatus` returns `paid`, and the pending copy after the mocked clock passes 30 s.
- [ ] Step 2: Implement (lazy-load nothing heavy; Checkout.js is injected only on submit). Copy voice rules.
- [ ] Step 3: `npm test && npm run typecheck && npm run build`; sitemap excludes `/checkout/*` and `/thanks` (postbuild gate passes).

### Task 5: Switch CTAs, pricing copy, e2e in test mode, docs

**Files:** Modify `app/components/TierCard.tsx` (buyable → `cta='checkout'` default: Button to `/checkout/<tierId>` labelled "Buy <label>", keeps `view_tier`; add `track('begin_checkout')` on click), `app/routes/services.$slug.tsx`, `app/routes/pricing.tsx` (pass nothing; default flips), `tests/tiercard.test.tsx`; `e2e/checkout.spec.ts` (skipped unless `E2E_RAZORPAY=1`: fills the form on `/checkout/websites-launch`, asserts the Razorpay iframe opens; the payment itself stays manual); README (phase 2 section: env vars, Worker deploy, webhook setup link, test-mode walkthrough); morning notes.

- [ ] Step 1: Tests: buyable TierCard links to `/checkout/websites-launch` and fires `begin_checkout` on click; quote tier unchanged (`/contact?tier=`).
- [ ] Step 2: Implement; `npm test && npm run typecheck && npm run build && npm run test:e2e`.
- [ ] Step 3: Worker: `npm run worker:test`; `wrangler deploy --dry-run` (no real deploy; deploy needs Yogesh's Cloudflare login → morning note).

## Morning notes for Yogesh (phase 2)

- Razorpay: create account/KYC, copy test keys → `wrangler secret put RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`; set the test `VITE_RAZORPAY_KEY_ID` in the Pages **Preview** env only (the live key goes into Production after KYC; see the go-live order).
- Resend: domain techpravaha.com verified; `RESEND_API_KEY`.
- Apps Script: deploy `scripts/google-apps-script-orders.js` against a new "TP Orders" sheet; set `SHEETS_WEBHOOK_URL` + `SHEETS_WEBHOOK_TOKEN`.
- Cloudflare: create KV namespace `techpravaha-orders`, paste ids into `wrangler.toml`; `wrangler deploy`; route `api.techpravaha.com`.
- Decide `BOOKING_URL` (Google Calendar appointment schedule) for the receipt email and the site.
- Worker toolchain: wrangler 4.149 needs Node >= 22 (root site runs on Node 20); use `node@22` for `npm run worker:dev`/deploy. Pin TypeScript ^6 in the Worker if you want it to match the root.
- Growth tiers: the 50% deposit is now implemented. The four buyable Growth tiers carry `"depositPct": 50` in `catalogue.json`; checkout charges half the GST-inclusive total and shows "Charged now: ₹X (50% deposit)" and "Balance at launch: ₹Y"; the receipt and the Orders Sheet carry the deposit and the balance due at launch. The balance is invoiced by hand at launch. If you prefer full payment, set `depositPct` to 100 (or remove it) and change the "50% at checkout, 50% at launch" copy (catalogue `payment` lines, Terms, Refunds, the pricing FAQ, the service FAQs) in the same commit.
- Worker auto-deploy: `.github/workflows/deploy-worker.yml` redeploys the Worker when `catalogue.json` or `workers/**` changes on `main`. Add the GitHub repo secrets `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`, and do the first deploy by hand once the KV ids are in `wrangler.toml` (the workflow fails until then). Until the secrets exist, run `npm run worker:deploy` on Node 22 after every price edit; checkout refuses an order whose amount differs from the page.
- Orders Sheet: two columns at the end, "Deposit" and "Balance due at launch" (17 in total; see the Apps Script header).
- Online payment stays off until `VITE_RAZORPAY_KEY_ID` is set (not the `rzp_test_XXXX` placeholder) in the Pages env: `/checkout/*` shows the price, a disabled form and "Online payment is not switched on yet." with WhatsApp. Set `VITE_API_URL` too if the Worker is not on `https://api.techpravaha.com`.

### Go-live order (revised after the phase 2 final review)

1. Razorpay, test mode: test keys, the test webhook (`payment.captured`, its own secret), auto-capture on, and the account's registered website includes `techpravaha.com`. If the account is shared with ATS, expect a "Payment for unknown order" alert for every ATS payment (webhooks are account-wide).
2. Resend: verify `techpravaha.com`, create the sending key (`RESEND_API_KEY`).
3. Apps Script: deploy the orders script against "TP Orders" (17 headers), copy the `/exec` URL and the token.
4. Cloudflare: create the KV namespaces and paste the ids into `wrangler.toml`; `wrangler secret put` the six secrets with the **test** keys; turn on Workers Logs; `npm run worker:deploy` on Node 22; route `api.techpravaha.com/*`; the WAF rate limit on `POST /orders`; confirm the Workers plan (Free allows 1,000 KV writes a day).
5. Growth decision: the 50% deposit is implemented; keep it, or set `depositPct` to 100 and change the copy (see the Growth note above).
6. Walkthrough on a Pages preview: `VITE_RAZORPAY_KEY_ID=rzp_test_...` in the Pages **Preview** environment only, the preview origin added to `ALLOWED_ORIGINS`. Pay by card, by UPI, and once after closing the Razorpay window; then remove the preview origin and delete the test rows.
7. After KYC: live keys and the live webhook secret on the Worker (redeploy), then the ₹1 Payment Link check.
8. Production Pages environment with `VITE_RAZORPAY_KEY_ID=rzp_live_...`, then redeploy the site.
9. Optional: buy the cheapest tier for real and refund it. Then announce.
- GST on advances: the Orders Sheet shows full-order Price/GST/Total; the GST collected on a 50% deposit (e.g. ₹8,550 of ₹56,050 on Websites Growth) is not a separate column. Ask the CA whether receipt vouchers need it; add a column if so.
