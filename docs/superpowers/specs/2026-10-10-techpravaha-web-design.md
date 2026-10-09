# Tech Pravaha website — design spec

Date: 2026-10-10 · Status: draft for review · Owner: Yogesh Laddha
Brand canvas: https://claude.ai/artifact/UbNa9VozKZmugrNQDShMQ7

## 1. Purpose

Rebrand techpravaha.com (currently a 301 to appropriatetechsolutions.com) as its own studio site that sells packaged design-and-build services to Indian founders and SMBs, with direct purchase via Razorpay, bespoke quotes, SEO-first service pages, analytics, and lead hooks.

**Positioning.** Tech Pravaha is a design and build studio for things you launch — websites, apps, AI front-doors and growth automation — delivered in weeks, at a price you can see.
**Split with ATS.** ATS = systems your operations run on (months, bespoke, industries). TP = things you launch (weeks, packaged, visible pricing). Each site links to the other as "same studio".
**Tagline.** Beautiful things, shipped.
**Voice.** Short declarative lines, numbers over adjectives, second person, Indian context assumed (INR, GST, UPI, WhatsApp). No superlatives, no em-dashes in visible copy (house style shared with the portfolio site).

Success = a visitor can understand what TP does in 5 seconds, see a price without asking, and either pay or message on WhatsApp without leaving the page; service pages rank for "<service> agency India"-type queries; every buy, book and WhatsApp click is measured.

## 2. Brand (direction A — Chrome)

| Token | Value | Use |
|---|---|---|
| `--ground` | `#0A0A0C` | page background |
| `--surface` | `#141418` | cards |
| `--line` | `#1E1E24` / `#2A2A31` (strong) | borders |
| `--ink` | `#F4F4F6` | primary text, primary button fill |
| `--ink-2` | `#C9CCD6` | body text |
| `--muted` | `#9A9AA6` | labels |
| `--muted-2` | `#7C8090` (light theme `#606878`) | footers, hints; both hold ≥4.5:1 on their ground |
| `--accent` | `#A8BD9A` sage | signals only: badges, list ticks, eyebrow dot, links. Never a button fill. |
| `--chrome` | `linear-gradient(110deg,#FFF 0%,#C9CCD6 18%,#5B5F6E 40%,#EDEEF2 55%,#7C8090 76%,#FFF 100%)` | tagline text, mark on dark |

**Themes.** Dark is the default and the brand's native state; a light theme ships in v1 with a nav toggle (persisted in `localStorage`, honours `prefers-color-scheme` on first visit, no flash: theme class set inline in `<head>` before paint, as ATS does). Light tokens: ground `#F7F8FA`, surface `#FFFFFF`, line `#E3E5EB`/`#CBCFD8`, ink `#0A0A0C`, ink-2 `#3C4354`, muted `#5C6579`, muted-2 `#606878`, accent `#5A754E` (sage darkened to hold 4.5:1 on the light ground, 4.83:1; was `#5A754E`, 4.49:1; the dark theme keeps `#A8BD9A`). Chrome gradient flips to a darker steel in light mode (`#2A2D36 → #9A9EAC → #1A1C22 → #C9CCD6 → #3C4050`). Every component is built from tokens only; no hard-coded hex outside `theme.css`.

**Motion.** Premium, restrained: section reveals (fade + 12px rise, 400–600ms, staggered 60ms), hover lifts on cards (2px, 150ms), magnetic/scale on primary buttons, a tracing line on the "how it works" steps, animated number counters on the trust strip, chrome sheen on the tagline. All via `motion`; everything respects `prefers-reduced-motion`; no scroll-jacking; nothing blocks interaction.

**Type.** Bricolage Grotesque (display, 600, `opsz` 96 at ≥44px, tracking −0.035 to −0.045em) · Geist (body 400/500/600) · JetBrains Mono (eyebrows, labels, prices' units; uppercase, tracking 0.1–0.14em). Self-hosted woff2 like ATS. Scale: 12/13/14/15/16/19 body; 24/28/40/64/clamp(56px, 8.6vw, 128px) display.

**Mark — Cornerstone.** A square whose top-right corner is a full quarter-circle, with a sage dot at lower-left. SVG (viewBox 0 0 100 100): `<path d="M 18 18 H 50 A 32 32 0 0 1 82 50 V 82 H 18 Z"/><circle cx="34" cy="66" r="8"/>`. Appears at 26–28px in the nav, 32px favicon, max 64px anywhere. Never as a hero graphic.
**Wordmark.** "Tech Pravaha" in Bricolage Grotesque 600, −0.02em.
**Shape language.** Pills (999px) for buttons and chips; 16–18px radius for cards; 10–12px for inputs and small tiles.

**Signature effect.** The hero tagline rendered in liquid chrome using React Bits Metallic Paint (WebGL2, MIT + Commons Clause — use allowed, resale not). Subject = the tagline text rasterised at runtime from the same font to an offscreen canvas and passed as `imageSrc`; falls back to CSS chrome gradient text when WebGL2 is unavailable, on `prefers-reduced-motion`, or on viewports < 768px. Lazy-mounted after first paint. This is the only shader on the site; everything else is `motion` (Framer) reveals and hover states, kept under 300ms.

## 3. Site map and content

```
/                       home
/services               index of six
/services/websites      /services/apps  /services/ai  /services/whatsapp  /services/content  /services/design
/pricing                all tiers, grouped by service
/work  /work/<slug>     launched products and client work
/lab   /lab/<slug>      micro-apps hosted live
/journal  /journal/<slug>   blog (automated pipeline, phase 4)
/about  /contact
/terms  /privacy  /refunds      (Razorpay activation prerequisites)
/checkout/<tierId>  /thanks     purchase flow
/styleguide             tokens and components (noindex)
/404
```

**Home sections, in order:** hero (eyebrow · tagline in chrome · subline · "See packages" + "See the work" · service chips) → trust strip (fixed scope · fixed price · kickoff date on the invoice | UPI/card/netbanking, GST invoice | by the studio behind ATS) → six service cards with "from ₹" → three featured work items → lab teaser (3 playable) → how it works (4 steps) → testimonials → final CTA with WhatsApp.

**Service page template:** breadcrumb → H1 + subline + facts rail (timeline, stack, includes, payment split) → tiers (Launch · Growth · Bespoke) → "what happens after you pay" (4 steps) → FAQ (5–7, FAQPage schema) → related work → CTA.

**Work.** Two tracks. *Launched* (named, with permission granted 2026-10-10): Exhibition App (Flutter + Firebase attendee app + admin web), Qui Ambassador App (Flutter), Home Manager (React + Sheets), IntPro (in progress, India-first SaaS for interior studios). ATS products are not listed; a footer line cross-links. Each item: one-line problem, what shipped, stack, 2–3 screenshots, timeline.
**Lab.** Curated 8–10 from `~/Documents/ChatGPT/{Extensios,Fun}` and `~/Downloads/newproducts`: single-file apps are copied to `public/lab/<slug>/index.html` (hosted as-is, own meta); extensions/PWAs get a card linking to their store/repo. Lab index shows a card grid with "Play" links.
**Testimonials.** `content/testimonials.ts` — real quotes only (name, role, company, service, date, source). Source: Yogesh's Upwork client feedback, transcribed verbatim with the client's first name + initial and country unless full attribution is cleared; linked back to the Upwork profile. The section renders only when ≥2 entries exist. No invented reviews, ever.
**Journal.** Markdown/MDX in `content/journal/`, frontmatter (title, date, summary, tags, cover). Route renders prerendered HTML + RSS. v1 ships the route with 3 hand-written seed posts; the automation (phase 4) drafts posts from a topic sheet via Claude, opens a PR per post, Yogesh approves, merge deploys. The pipeline itself is the proof point for the content service and is described on `/services/content`.

## 4. Catalogue and pricing

Single source of truth: `catalogue.json` at repo root, imported by the site (for display) and by the Worker (for the amount sent to Razorpay — the client never sends a price). Editing a number on GitHub's web UI and merging redeploys in ~1 minute; that is the "instant update" path. A `scripts/validate-catalogue.ts` test guards the schema.

```jsonc
{
  "currency": "INR",
  "gst": 0.18,
  "services": [
    { "id": "websites", "name": "Websites & landing pages", "route": "/services/websites",
      "tiers": [
        { "id": "websites-launch", "name": "Launch", "tagline": "One page that converts", "price": 35000,
          "buyable": true, "weeks": 2, "includes": ["1 landing page, up to 6 sections", "..."], "badge": null },
        { "id": "websites-growth", "name": "Growth", "price": 95000, "buyable": true, "weeks": 4, "badge": "Most chosen", "includes": ["..."] },
        { "id": "websites-bespoke", "name": "Bespoke", "price": null, "from": 150000, "buyable": false, "includes": ["..."] }
      ] }
  ],
  "addons": [ { "id": "care", "name": "Care", "from": 5000, "per": "month", "buyable": false } ]
}
```

**Launch prices (ex-GST), competitive-premium for the Indian SMB market:**

| Service | Launch | Growth | Bespoke / From |
|---|---|---|---|
| Websites | ₹35,000 | ₹95,000 | from ₹1,50,000 |
| Apps | Prototype ₹45,000 | MVP from ₹2,50,000 (quote) | from ₹6,00,000 |
| AI | Assistant ₹60,000 | Call centre from ₹1,20,000 setup + usage (quote) | from ₹3,00,000 |
| WhatsApp | Setup ₹25,000 | Automation ₹65,000 | from ₹1,20,000 |
| Content | Starter ₹40,000 | Studio ₹85,000 | from ₹1,50,000 |
| Design | Audit ₹15,000 | Redesign ₹70,000 | from ₹1,50,000 |
| Care add-on | — | — | from ₹5,000/month, invoiced |

Payment terms shown on every tier: full payment at checkout for Launch tiers; Growth tiers 50% at checkout, 50% at launch (second invoice manual in v1). Prices display ex-GST with "+18% GST" and the inclusive total at checkout.

## 5. Commerce flow

```
Tier card "Buy" → /checkout/<tierId> (prerendered page: summary, GST total, name/email/phone/GSTIN form)
  → POST https://api.techpravaha.com/orders {tierId, customer}        Worker: validates against catalogue.json,
                                                                        creates Razorpay Order (amount from catalogue), returns order_id + key_id
  → Razorpay Checkout.js modal (UPI/card/netbanking)
  → on success: client → /thanks?order=…  (optimistic)
  → Razorpay webhook POST /webhooks/razorpay (payment.captured)        Worker: verifies HMAC signature, idempotent on payment_id,
       → appends row to "TP Orders" Google Sheet via Apps Script (same pattern as ATS lead capture)
       → sends email via Resend: receipt summary, intake form link, kickoff booking link (Google Calendar appointment schedule)
       → sends internal WhatsApp/Telegram ping to Yogesh (phase 2b, optional)
```

- Worker: `workers/techpravaha-api` (Cloudflare Worker, TypeScript). Secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SHEETS_WEBHOOK_URL`. All in `.env.example` with dummies.
- Razorpay test mode end to end before live; live needs KYC + the legal pages deployed.
- Failure handling: webhook retries are idempotent (payment_id as key); if the Sheet append fails the email still sends and the failure is logged (Worker logs + an error email to Yogesh). The `/thanks` page never claims "confirmed" until the webhook has run — it polls `GET /orders/<id>/status` for up to 30s, then says "receipt is on its way".
- Refunds are manual from the Razorpay dashboard; `/refunds` page states the policy (full refund before kickoff call; pro-rata after).

## 6. SEO, analytics, hooks

- Prerendered static HTML for every route (React Router 7 `ssr:false` + prerender, as ATS). Per-route `<title>`, description, canonical, OG/Twitter tags via a `meta()` builder copied from ATS; one static OG image per service, one default.
- JSON-LD: `Organization` (site-wide), `Service` + `Offer` per tier (price, priceCurrency INR, availability), `FAQPage` on service pages, `BreadcrumbList`, `Article` on journal posts. `sitemap.xml` generated at build from the route table + content; `robots.txt`; `/styleguide` and `/thanks` are `noindex`.
- Performance budget: Lighthouse ≥ 90 performance / 100 SEO / ≥ 95 a11y on home and a service page, mobile. Metallic Paint lazy; fonts preloaded; no layout shift from reveals.
- Analytics: GA4 + Microsoft Clarity (pattern from ATS). Events: `view_tier`, `begin_checkout`, `purchase` (with value), `whatsapp_click`, `book_click`, `lead_submit`, `lab_play`. Consent: analytics load after a minimal non-blocking notice (India has no cookie-banner mandate; keep it one line).
- Hooks, in priority: (1) WhatsApp click-to-chat in nav and every CTA block, prefilled message naming the page; (2) Razorpay buy; (3) kickoff booking link; (4) contact form → Apps Script → Sheet + email; (5) chatbot twin of ATS's Atlas on the same Worker proxy (phase 3); (6) lead magnet "free 10-point site teardown" form (phase 3).

## 7. Repo, stack, deploy

- Repo `techpravaha-web` (private). Stack: React Router 7 framework mode (prerender), React 19, TypeScript, Tailwind 4 with tokens in `app/theme.css`, `motion`, Phosphor icons. Copied from `ats_website`, not shared: `lib/meta.ts`, sitemap script, `Reveal`, Sheets service, chatbot client. Metallic Paint ported to TS in `app/components/MetallicPaint.tsx`.
- Layout: `app/routes/*`, `app/components/*`, `app/lib/*`, `content/{work,lab,journal,testimonials}`, `catalogue.json`, `public/lab/*`, `workers/techpravaha-api`, `docs/`, `CLAUDE.md`.
- Hosting: Cloudflare Pages (`build/client`), custom domain techpravaha.com + www; Worker on `api.techpravaha.com`. DNS already on Cloudflare (assumed; verify).
- Cutover: deploy to a preview URL → QA → add custom domain → remove the existing 301 (wherever it lives: Cloudflare redirect rule or the ATS `_redirects`) → add the ATS footer cross-link in `ats_website` (small PR there) → submit sitemap in Search Console.
- Conventional commits; `feat/<slug>` branches off `main`; one PR per phase; Claude reviews, Yogesh merges. For phase 1 Yogesh asked for a single commit after everything is done (no per-task commits).

## 8. Phases

1. **Foundation** — brand tokens, layout, all routes with real copy, catalogue display, work + lab + testimonials data, journal route with seed posts, legal pages, SEO, analytics, Metallic Paint hero, styleguide. Deployable and indexable without checkout.
2. **Commerce** — Worker, Razorpay test → live, checkout and thanks pages, Sheet + Resend + booking.
3. **Hooks** — chatbot, lead magnet, internal order pings.
4. **Journal automation** — topic sheet → Claude draft → PR → approve → publish.

Redirect cutover happens at the end of phase 1 (site is useful without checkout) or phase 2 — Yogesh's call at the time.

## 9. Testing

- `npm run typecheck` on every task; Vitest for `catalogue.json` validation, price/GST math, Worker signature verification and idempotency, meta builder output.
- Playwright smoke: every route renders with its H1 and meta; checkout flow in Razorpay test mode completes and `/thanks` reaches "confirmed"; WhatsApp links carry the page name.
- Lighthouse CI on home + one service page against the budget in §6; axe accessibility pass.
- Manual: real phone on 4G for the hero (fallback must kick in below 768px), Razorpay UPI test, one real ₹1 live transaction before announcing.

## 10. Out of scope (v1)

Light theme · accounts/dashboards · Razorpay Subscriptions · multi-currency · blog automation (phase 4) · ATS content changes beyond the cross-link · naming clients beyond those cleared on 2026-10-10.

## 11. Open items for Yogesh

- Real testimonials (3–5: name, role, company, quote, which service).
- Screenshots for the four Work items.
- Razorpay account KYC start (needs legal pages live — phase 1 end).
- Confirm DNS for techpravaha.com is on Cloudflare and where the current 301 is configured.
