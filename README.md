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

Never commit real secrets. Any new env var goes into `.env.example` with a dummy value in the same commit.

## Changing prices

`catalogue.json` at the repo root is the only price source. The site, the pricing page, the JSON-LD offers and the WhatsApp messages all read it.

1. Open `catalogue.json` on GitHub and edit the `price` (rupees, ex-GST) or the `includes` list of a tier.
2. Commit to a branch and open a pull request. CI (`.github/workflows/ci.yml`) runs typecheck, the unit tests and the build on every pull request; the catalogue tests check structure only (integer prices, `from` on quote tiers, badges), so a price edit never needs a test change.
3. Merge. Cloudflare Pages rebuilds and redeploys in about a minute.

The real gate is the build: `npm run build` imports the catalogue, which runs `validateCatalogue` (unique ids, integer prices, a price on every buyable tier, a `from` on every quote tier, non-empty includes). A bad file fails the build, so the deploy fails and the previous version stays live. Make the CI check required on `main` in the GitHub branch settings so a red PR cannot merge.

The phase 2 Worker reads the same file, so checkout amounts cannot drift from what the site shows. Prices display ex-GST with a "+18% GST" note.

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
| Other environment variables | The five `VITE_*` values above |

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

## Quality budget (as of 2026-10-10)

Lighthouse CI, mobile preset, 3 runs per page, asserted on the median run (`aggregationMethod: median-run`, not best-of-3). Budget: performance at least 0.90, SEO 1.00, accessibility at least 0.95, best practices at least 0.90.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 0.99 | 1.00 | 1.00 | 1.00 |
| `/services/websites` | 0.94 | 1.00 | 1.00 | 1.00 |

Performance varies by about 0.1 between single runs (simulated mobile throttling). Across the runs taken on the day, `/services/websites` ranged 0.88 to 0.98 and `/` 0.92 to 0.99; the last two median-gated autoruns scored 0.94 on `/services/websites` (individual runs 0.93 to 0.96) and 0.99 on `/`. Accessibility, best practices and SEO were stable. If a run misses, re-run before treating it as a regression.

`scripts/postbuild.ts` strips the `modulepreload` links React Router adds to every prerendered page (outside `assets/` and `lab/play/`). They are about 350 KB of scripts that compete with CSS and fonts on slow mobile links; without them mobile FCP went from 3.6 s to 2.1 s. The module script still hydrates the page. Postbuild fails if any page still carries one.

## Phases

1. **Foundation** (this repo state): brand, layout, all routes with real copy, catalogue display, work, lab, journal, legal pages, SEO, analytics, styleguide. Deployable and indexable without checkout.
2. **Commerce**: Cloudflare Worker (`workers/techpravaha-api`), Razorpay test then live, checkout and thanks pages, Sheet and Resend, booking.
3. **Hooks**: chatbot, lead magnet, internal order pings.
4. **Journal automation**: topic sheet to Claude draft to PR to approve to publish.

## Docs

- Spec: `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md`
- Plans: `docs/superpowers/plans/`
- Agent context and working rules: `CLAUDE.md`
