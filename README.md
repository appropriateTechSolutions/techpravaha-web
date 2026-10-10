# Tech Pravaha website

Marketing and commerce site for Tech Pravaha, a design and build studio for things you launch: websites, apps, AI front-doors and growth automation. Every route is prerendered to static HTML; there is no runtime server.

## Stack

| Piece | Version |
|---|---|
| Node | 20 or newer (built and tested on 20.19) |
| React / React DOM | 19.3 |
| React Router (framework mode, `ssr: false` + prerender) | 7.18 |
| Vite | 8.3 |
| TypeScript | 6.0 |
| Tailwind CSS (tokens in `app/theme.css`) | 4.3 |
| motion (`m.*` inside `LazyMotion`) | 14.1 |
| Vitest + Testing Library | 4.1 |
| Playwright (chromium) | 1.64 |
| Cloudflare Worker (`workers/techpravaha-api`, wrangler) | 4.149, needs Node 22 |
| Lighthouse CI | 0.15 |

Fonts are self-hosted through fontsource: Bricolage Grotesque (display), Geist (body), JetBrains Mono (labels). Icons are Phosphor.

## Quick start

```bash
npm install
cp .env.example .env   # fill the VITE_* values (all optional in dev)
npm run dev            # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | `react-router build` (prerenders every route to `build/client`), then `scripts/postbuild.ts` (sitemap, RSS, `404.html`, checks) |
| `npm run preview` | Serve `build/client` locally (`npx serve`) |
| `npm run typecheck` | `react-router typegen` then `tsc` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke tests against `build/client` on port 4173. Run `npm run build` first. First time on a machine: `npx playwright install chromium`. Build with the `VITE_*` ids unset: with `VITE_GA_ID` or `VITE_CLARITY_ID` in `.env` the build loads external scripts, and the "no console errors" test can then fail on third-party noise |
| `npm run og` | Regenerate the Open Graph images in `public/og/` |
| `npm run worker:dev` / `worker:test` / `worker:deploy` | The commerce Worker: local dev on port 8787, its unit tests, deploy. Node 22 (see Phase 2) |
| `npx @lhci/cli autorun` | Lighthouse CI against `build/client` (budget below). Run `npm run build` first |

## Environment variables

Set these in `.env` locally and in the Cloudflare Pages project for production. They are inlined at build time, so changing one means a redeploy. The list is mirrored in `.env.example`.

| Variable | What it unlocks |
|---|---|
| `VITE_WHATSAPP_NUMBER` | Digits only with country code, e.g. `919876543210`. Turns every WhatsApp button into a `wa.me` click-to-chat link with a message naming the page or tier. Unset, those buttons fall back to `/contact`. |
| `VITE_GA_ID` | Google Analytics 4 measurement id (`G-...`). Loaded when the page is idle. Unset, GA is skipped. |
| `VITE_CLARITY_ID` | Microsoft Clarity project id. Keep masking on Balanced or Strict in the Clarity settings, or the privacy page stops being accurate. Unset, Clarity is skipped. |
| `VITE_LEADS_SCRIPT_URL` | Google Apps Script web-app URL that appends contact-form leads to a private sheet and emails them. Unset, the form shows the WhatsApp/email fallback on every submit. |
| `VITE_BOOKING_URL` | Call-booking link (Google Calendar appointment page or Calendly). Unset, it points at `/contact` and the "Prefer a call?" block on `/contact` is hidden. |
| `VITE_API_URL` | Base URL of the `techpravaha-api` Worker that creates Razorpay orders and reports order status. Unset, it is `https://api.techpravaha.com`. |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key id (`rzp_test_...` or `rzp_live_...`). Only switches online payment on; Checkout.js uses the key id the Worker returns. Unset or the placeholder, `/checkout/*` shows the price and a WhatsApp fallback instead of the Pay button. |

Never commit real secrets. Any new env var goes into `.env.example` with a dummy value in the same commit.

## Changing prices

`catalogue.json` at the repo root is the only price source. The site, the pricing page, the JSON-LD offers and the WhatsApp messages all read it.

1. Open `catalogue.json` on GitHub and edit the `price` (rupees, ex-GST), the `depositPct` (share charged at checkout, 1 to 100; absent means 100) or the `includes` list of a tier.
2. Commit to a branch and open a pull request. CI (`.github/workflows/ci.yml`) runs typecheck, the unit tests and the build on every pull request; the catalogue tests check structure only (integer prices, `from` on quote tiers, badges), so a price edit never needs a test change.
3. Merge. Cloudflare Pages rebuilds and redeploys in about a minute.
4. Redeploy the Worker. It bundles `catalogue.json` when it is deployed, so until then it still charges the old amount. On `main`, `.github/workflows/deploy-worker.yml` does this whenever `catalogue.json` or `workers/**` changes (it needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets). By hand: `npm run worker:deploy` on Node 22.

The real gate is the build: `npm run build` imports the catalogue, which runs `validateCatalogue` (unique ids, integer prices, a price on every buyable tier, a `from` on every quote tier, non-empty includes). A bad file fails the build, so the deploy fails and the previous version stays live. Make the CI check required on `main` in the GitHub branch settings so a red PR cannot merge.

The site and the Worker can disagree for a while: Pages and the Worker deploy separately, and a Worker that was not redeployed keeps the old prices. Checkout guards against that: it compares the Worker's order amount with the amount the page shows and refuses to open Razorpay when they differ (the buyer sees "nothing was charged" and the WhatsApp fallback, and GA gets a `checkout_mismatch` event). Nobody is charged a different amount, but that tier cannot be bought until both are deployed. Prices display ex-GST with a "+18% GST" note.

## Adding content

### A work item

1. Add an entry to `WORK` in `app/content/work.ts` (slug, name, one-liner, what shipped, stack, timeline, services, images).
2. Put screenshots in `public/work/<slug>/` and list them in `images`.
3. `scripts/lib/paths.ts` scans `work.ts` for `slug: '...'`, so the `/work/<slug>` page is prerendered and added to the sitemap with no other change.
4. Only real work, named with the client's permission.

### A lab app

1. Apps go in `public/lab/play/<slug>/index.html`. They are served as static files; there is no `/lab/:slug` route.
   An app must not call a third-party API from the browser (no AI API keys, no data leaving the page). `tests/content.test.ts` scans every lab HTML file and fails on known AI API hosts or a `fetch` to an outside host.
2. Add `play('<slug>', 'Name', 'One-sentence blurb.', ['tag', 'tag'])` to `LAB` in `app/content/lab.ts`.
3. Extensions and web apps without a public listing keep `href: '#'` until a store or hosted URL exists.

### A journal post

1. Create `app/content/journal/YYYY-MM-DD-<slug>.md` with frontmatter:

   ```
   ---
   title: Post title
   date: 2026-10-10
   summary: One sentence for the list page, the RSS feed and meta description.
   tags: pricing, studio
   ---
   ```

2. Write the body in Markdown (`##` headings, internal links like `[pricing](/pricing)`).
3. The loader validates frontmatter and dates at build time; a bad post fails the build and the tests. The route, sitemap entry and RSS item are generated.
4. House voice applies: short declarative lines, no superlatives, no em-dashes.

### A testimonial

Add a real entry to `TESTIMONIALS` in `app/content/testimonials.ts`, transcribed verbatim (Upwork review or a message the client agreed to share). Never write or improve a quote. The section renders only when there are two or more entries; the file ships empty on purpose.

## Deployment (Cloudflare Pages)

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `build/client` |
| Environment variable `NODE_VERSION` | `20` |
| Other environment variables | The seven `VITE_*` values above (`VITE_API_URL` and `VITE_RAZORPAY_KEY_ID` switch checkout on) |

`public/_headers` sets security headers and cache rules; `public/_redirects` holds the legacy redirects. Cloudflare serves `404.html` for unknown URLs.

### Cutover checklist

Site-wide go-live, from spec section 7:

1. Deploy to a Pages preview URL and QA it: every route, theme toggle, mobile layout, WhatsApp links, contact form, env ids set.
2. Add the custom domain `techpravaha.com` and `www` to the Pages project.
3. Remove the existing 301 for the domain (a Cloudflare redirect rule, or the ATS `_redirects`, wherever it lives).
4. Add the Tech Pravaha cross-link to the ATS site footer (a small PR in `ats_website`).
5. Submit `https://techpravaha.com/sitemap.xml` in Google Search Console.
6. Run Lighthouse against the Pages preview URL before step 2 (the local budget run uses a plain static server, not Cloudflare), for example `npx lighthouse <preview-url> --form-factor=mobile`.
7. Check the URL form: `curl -I https://techpravaha.com/services/websites/` must return 200, and `curl -I https://techpravaha.com/services/websites` must return 308 to `/services/websites/`. Canonicals, the sitemap, RSS and JSON-LD all use the trailing-slash form.
8. Cut over only after phase 2 (checkout) is live, or soften the Razorpay/"at checkout" payment copy first (Terms 4, Privacy "Payments", Refunds 7, the home trust strip, the service-page payment note, the pricing FAQ and the catalogue's "at checkout" payment lines).

Placeholders that must be replaced before announcing are tracked as "Morning notes for Yogesh" at the end of the phase 1 plan in `docs/superpowers/plans/`.

## Quality budget (as of 2026-10-10, phase 1 final run)

Lighthouse CI, mobile preset, 3 runs per page, asserted on the median run (`aggregationMethod: median-run`, not best-of-3). Budget: performance at least 0.90, SEO 1.00, accessibility at least 0.95, best practices at least 0.90.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 0.92 | 1.00 | 1.00 | 1.00 |
| `/services/websites/` | 0.97 | 1.00 | 1.00 | 1.00 |

Individual performance runs in that autorun were 0.91 to 0.95 on `/` and 0.93 to 0.97 on `/services/websites/`. Performance varies by about 0.1 between single runs (simulated mobile throttling); earlier runs the same day ranged 0.88 to 0.99. Accessibility, best practices and SEO were stable. If a run misses, re-run before treating it as a regression. These numbers pre-date the phase 2 checkout and thanks pages, which are `noindex` and not in the LHCI set; re-run `npx @lhci/cli autorun` after a change that touches the shared bundle.

`scripts/postbuild.ts` strips the `modulepreload` links React Router adds to every prerendered page (outside `assets/` and `lab/play/`). They are about 350 KB of scripts that compete with CSS and fonts on slow mobile links; without them mobile FCP went from 3.6 s to 2.1 s. The module script still hydrates the page. Postbuild fails if any page still carries one.

## Phase 2 · Commerce

**Architecture.** The site stays static. A Cloudflare Worker (`workers/techpravaha-api`, plain `fetch` handler, no framework) owns every secret. `/checkout/<tierId>/` (prerendered for each buyable tier) collects name, email and phone, calls the Worker, and opens Razorpay Checkout.js; Checkout.js is loaded only when the buyer presses Pay. The Worker prices the order itself from `catalogue.json` (the client never sends an amount), creates the Razorpay order and stores it in KV. After payment Razorpay calls the Worker's webhook; once the signature checks out the Worker marks the order paid (idempotent on the payment id), appends a row to the "TP Orders" Google Sheet through an Apps Script web app, and emails the receipt through Resend. `/thanks/?order=<id>` polls the status endpoint and only says "confirmed" once the Worker reports `paid`. Quote-only tiers keep `/contact?tier=<id>`; with `VITE_RAZORPAY_KEY_ID` unset, checkout shows the price and a WhatsApp fallback.

**Worker endpoints** (CORS limited to `ALLOWED_ORIGINS`):

| Endpoint | Request | Response |
|---|---|---|
| `POST /orders` | JSON `{ tierId, customer: { name, email, phone, company?, gstin? }, page? }`. Unknown keys, or a quote-only or unknown tier, get a 400. | 200 `{ orderId, amount (paise charged now, GST included: the deposit for a tier with depositPct below 100), currency: "INR", keyId, tier: { label }, service: { name } }`. 400 `{ error, fields? }`, 502 provider error, 500 could not save. |
| `POST /webhooks/razorpay` | Razorpay's `payment.captured` event, signed with `X-Razorpay-Signature` (HMAC-SHA256 over the raw body). | 400 on a bad or missing signature, 413 on a body over 64 KiB. Otherwise 200 `{ ok: true }` (also `duplicate`, `unknown` or `ignored` variants), including when the Sheet or email step fails (an alert goes to `ALERT_EMAIL`). 500 only when KV fails before the payment is recorded, so Razorpay retries. |
| `GET /orders/:id/status` | Razorpay order id (`order_...`). | 200 `{ status: "created" or "paid", tierId, tier, service, amountPaise (charged now), totalPaise (full order), depositPct }`, never customer data. Read with a 30 s KV edge cache. 404 for unknown or malformed ids, 503 if KV is down. |
| `GET /health` | None. | `{ ok: true, version }` |

**Site environment variables** (Pages env; inlined at build, so changing one means a redeploy):

- `VITE_API_URL`: Worker base URL. Unset, it is `https://api.techpravaha.com`.
- `VITE_RAZORPAY_KEY_ID`: public key id (`rzp_test_...`, later `rzp_live_...`). Unset or the placeholder, online payment stays off.

**Worker secrets** (`wrangler secret put <NAME>`, never in git): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SHEETS_WEBHOOK_URL`, `SHEETS_WEBHOOK_TOKEN`.

**Worker vars** (`wrangler.toml` `[vars]`, committed): `ALLOWED_ORIGINS`, `FROM_EMAIL`, `ALERT_EMAIL`; optional `BOOKING_URL` and `WHATSAPP_NUMBER` for the receipt email. Local dev reads dummies from `workers/techpravaha-api/.dev.vars` (copy `.dev.vars.example`; it is gitignored). Also needed before a deploy: the `ORDERS` KV namespace ids in `wrangler.toml`.

**Deploy.** Follow `docs/ops/razorpay-setup.md` in the go-live order below. The Worker needs Node 22 (`cd workers/techpravaha-api && nvm use`, or `export PATH=/opt/homebrew/opt/node@22/bin:$PATH`); the site and CI stay on Node 20. `wrangler deploy --dry-run` builds the bundle without a login or real KV ids. After the first manual deploy, `.github/workflows/deploy-worker.yml` redeploys the Worker on every push to `main` that touches `catalogue.json` or `workers/**`.

**Growth tiers: 50% deposit.** The four buyable Growth tiers carry `"depositPct": 50` in `catalogue.json`, so checkout charges 50% of the GST-inclusive total ("Charged now: ₹X (50% deposit)", "Balance at launch: ₹Y"). The receipt and the Orders Sheet show the deposit and the balance due at launch; the balance is invoiced by hand at launch. To take full payment instead, remove `depositPct` (or set it to 100) and change the "50% at checkout, 50% at launch" copy in the catalogue, Terms, Refunds, the pricing FAQ and the service FAQs in the same commit.

**Go-live order** (the same list is in `docs/ops/razorpay-setup.md` and the phase 2 plan's morning notes):

1. Razorpay, test mode: test keys, the test webhook (`payment.captured`, its own secret), auto-capture on, and the account's registered website includes `techpravaha.com`. If the account is shared with ATS, expect an "unknown order" alert for every ATS payment: webhooks are account-wide.
2. Resend: verify `techpravaha.com`, create the sending key.
3. Apps Script: deploy the orders script against the "TP Orders" Sheet; copy the `/exec` URL and the token.
4. Cloudflare: KV namespaces (ids into `wrangler.toml`), the six secrets with the **test** keys, Workers Logs on (`[observability]` in `wrangler.toml` or the dashboard), `npm run worker:deploy` on Node 22, the `api.techpravaha.com` route, the WAF rate limit on `POST /orders`, and a Workers plan whose KV write allowance covers the traffic (Free allows 1,000 writes a day).
5. Growth decision: the 50% deposit is implemented; keep it, or switch to full payment as described above.
6. Test-mode walkthrough on a Pages preview (below), with the test key in the Preview environment only.
7. After KYC: live keys and the live webhook secret on the Worker (`wrangler secret put`, then redeploy), then the ₹1 Payment Link check (`docs/ops/razorpay-setup.md` section 7).
8. Production Pages environment: `VITE_RAZORPAY_KEY_ID=rzp_live_...`, then redeploy the site.
9. Optional: buy the cheapest tier once for real and refund it. Then announce.

**Test-mode walkthrough** (go-live step 6, on a Pages preview, never on production):

1. The Worker runs with Razorpay **test** keys and the test webhook pointed at `https://api.techpravaha.com/webhooks/razorpay`.
2. In the Pages project, set `VITE_RAZORPAY_KEY_ID=rzp_test_...` (and `VITE_API_URL` if not the default) in the **Preview** environment only, never Production, and deploy a preview branch.
3. Add the preview branch origin (for example `https://<branch>.<project>.pages.dev`) to `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy the Worker. Without it the browser blocks the call (CORS) and checkout says "Checkout did not open", with nothing in `wrangler tail`.
4. Buy Launch on `/pricing`: card `4111 1111 1111 1111`, any future expiry and CVV, then Success on the test bank page. Buy a Growth tier by UPI `success@razorpay` and check it charges the 50% deposit.
5. Once, open the Razorpay window, close it without paying, then press Pay again and pay. Razorpay must show the same order (no second order in the dashboard), and it must confirm normally.
6. Check: `/thanks` confirms, usually within a minute and up to two; the status endpoint says `paid`; one Orders Sheet row per payment; one receipt email per payment; no alert email. `docs/ops/razorpay-setup.md` section 5 has the full list.
7. Afterwards: remove the preview origin from `ALLOWED_ORIGINS` and redeploy the Worker, and delete the test rows from the Orders Sheet.
8. Browser e2e (optional, keeps the payment manual): start the Worker with `npm run worker:dev` on Node 22, with `.dev.vars` holding the Razorpay test keys and `ALLOWED_ORIGINS=http://localhost:4173`. Build the site against it, then run the spec, which fills the form on `/checkout/websites-launch/`, presses Pay and expects the Razorpay iframe within 15 s:

   ```bash
   VITE_API_URL=http://localhost:8787 VITE_RAZORPAY_KEY_ID=rzp_test_... npm run build
   E2E_RAZORPAY=1 VITE_API_URL=http://localhost:8787 npm run test:e2e -- checkout
   ```

   `VITE_*` values are inlined by `npm run build`, so they must be set on the build line (the same variable on the test line is harmless, the spec does not read it). Without `E2E_RAZORPAY` the spec skips itself.

## Phases

1. **Foundation** (done): brand, layout, all routes with real copy, catalogue display, work, lab, journal, legal pages, SEO, analytics, styleguide. Deployable and indexable without checkout.
2. **Commerce** (built, this repo state; needs Yogesh's accounts and keys to go live): Cloudflare Worker (`workers/techpravaha-api`), Razorpay test then live, checkout and thanks pages, Sheet and Resend. Booking link is `VITE_BOOKING_URL` / the Worker's `BOOKING_URL`.
3. **Hooks**: chatbot, lead magnet, internal order pings.
4. **Journal automation**: topic sheet to Claude draft to PR to approve to publish.

## Docs

- Spec: `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md`
- Plans: `docs/superpowers/plans/`
- Agent context and working rules: `CLAUDE.md`
