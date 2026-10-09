# Tech Pravaha — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship techpravaha.com as a prerendered, SEO-complete, dark/light studio site with the full catalogue displayed (Buy → WhatsApp in this phase), work, lab, journal, legal pages, analytics and the Metallic Paint hero — deployable to Cloudflare Pages without checkout.

**Architecture:** React Router 7 framework mode with `ssr:false` + full prerender (every route is real HTML in `build/client`), React 19, Tailwind 4 tokens in `app/theme.css`, `motion` for animation. All copy and catalogue live in data files (`catalogue.json`, `app/content/*`) so pages are templates. A post-build script writes `sitemap.xml`, `rss.xml` and OG images.

**Tech Stack:** react-router ^7.18, react 19, typescript ~5.8, vite ^6, tailwindcss ^4.2 (+ @tailwindcss/vite), motion ^12, @phosphor-icons/react, marked, @fontsource-variable/bricolage-grotesque, @fontsource-variable/geist, @fontsource/jetbrains-mono, vitest + @testing-library/react + jsdom, @playwright/test, tsx.

**Spec:** `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md` — read it first; this plan argues from it.

## Global Constraints

- Node ≥ 20. Package manager: npm. Scripts: `dev`, `build`, `typecheck`, `test`, `test:e2e`, `preview`.
- Every route prerendered; no runtime server. Output dir `build/client`.
- No hard-coded hex outside `app/theme.css`. Components use Tailwind token classes (`bg-ground`, `text-ink`, `text-accent`…).
- Dark is default (`:root`); light theme is `html.light`. Theme set inline in `<head>` before paint; persisted in `localStorage('theme')`; `prefers-color-scheme` honoured on first visit.
- Accent `#A8BD9A` (dark) / `#5A754E` (light) is for signals only: never a button fill.
- Type: Bricolage Grotesque display 600; Geist body; JetBrains Mono labels (uppercase, 0.1–0.14em).
- Copy voice: short declarative lines; no superlatives; **no em-dashes in visible copy** (use commas, full stops, or a middle dot `·`).
- All motion respects `prefers-reduced-motion`; nothing over 600ms; no scroll-jacking.
- Prices display ex-GST with "+18% GST" note; `catalogue.json` is the only price source.
- No invented facts: testimonials render only real entries (file ships empty); no fake stats.
- Phase 1 "Buy" CTAs link to WhatsApp with a prefilled message naming the tier; phase 2 swaps them to `/checkout/<tierId>`.
- Single commit at the end of the phase (Yogesh's instruction); do not commit per task.
- Lab apps are served as static files from `public/lab/play/<slug>/index.html`; there is no `/lab/:slug` route.

## Review Focus

1. `catalogue.json` with a buyable tier whose `price` is null, or duplicate tier ids → the build must fail with a named error, not render "₹NaN" (test in Task 3).
2. `VITE_WHATSAPP_NUMBER` unset → every WhatsApp CTA must fall back to `/contact`, never emit `https://wa.me/?text=` (test in Task 4).
3. A journal post with missing `date`/`title` or an unparsable date → build fails loudly; never renders "Invalid Date" (test in Task 10).
4. Metallic hero when `canvas.getContext('webgl2')` returns null, `prefers-reduced-motion`, or viewport < 768px → static chrome-gradient text, no thrown error, no empty hero (test in Task 12).
5. `localStorage` throwing (private mode) → page still renders in dark, toggle still flips the class (test in Task 2).

---

## File structure

```
techpravaha-web/
  package.json  tsconfig.json  vite.config.ts  react-router.config.ts  vitest.config.ts  playwright.config.ts
  .gitignore  .env.example  README.md  CLAUDE.md
  catalogue.json                      # single source of truth for services/tiers/prices
  app/
    root.tsx  routes.ts  theme.css
    lib/site.ts        # SITE_URL, names, pageMeta()
    lib/catalogue.ts   # typed loader + validate() + formatINR() + withGst()
    lib/schema.ts      # JSON-LD builders
    lib/whatsapp.ts    # waLink()
    lib/analytics.ts   # track(), loadAnalytics()
    lib/journal.ts     # markdown loader + frontmatter
    content/services.ts  content/work.ts  content/lab.ts  content/testimonials.ts
    content/journal/*.md
    components/Logo.tsx SiteHeader.tsx SiteFooter.tsx ThemeToggle.tsx
    components/ui/Button.tsx Pill.tsx Eyebrow.tsx Section.tsx Reveal.tsx Counter.tsx Faq.tsx JsonLd.tsx
    components/TierCard.tsx ServiceCard.tsx WorkCard.tsx LabCard.tsx Steps.tsx Testimonials.tsx
    components/ChromeText.tsx MetallicPaint.tsx MetallicHero.tsx ContactForm.tsx WhatsAppCta.tsx
    routes/home.tsx services.tsx services.$slug.tsx pricing.tsx work.tsx work.$slug.tsx lab.tsx
    routes/journal.tsx journal.$slug.tsx about.tsx contact.tsx terms.tsx privacy.tsx refunds.tsx
    routes/styleguide.tsx not-found.tsx catchall.tsx
    services/leads.ts  # Apps Script POST
  public/_headers _redirects robots.txt favicons/ og/ lab/play/<slug>/index.html
  scripts/postbuild.ts   # sitemap.xml + rss.xml into build/client
  scripts/og.ts          # OG PNGs via Playwright from an HTML template
  tests/*.test.ts(x)     # vitest
  e2e/smoke.spec.ts      # playwright
```

---

### Task 1: Scaffold, toolchain, fonts

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `react-router.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md`, `CLAUDE.md`, `app/root.tsx` (minimal), `app/routes.ts` (index only), `app/routes/home.tsx` (placeholder H1), `tests/setup.ts`.

**Produces:** `npm run dev|build|typecheck|test` all green; fonts available as `'Bricolage Grotesque Variable'`, `'Geist Variable'`, `'JetBrains Mono'`.

- [ ] Step 1: `npm init -y`, then install:
  `npm i react react-dom react-router @react-router/node isbot motion @phosphor-icons/react marked @fontsource-variable/bricolage-grotesque @fontsource-variable/geist @fontsource/jetbrains-mono`
  `npm i -D @react-router/dev vite @tailwindcss/vite tailwindcss typescript @types/react @types/react-dom @types/node vitest jsdom @testing-library/react @testing-library/jest-dom @playwright/test tsx`
- [ ] Step 2: `package.json` scripts:
  ```json
  "dev": "react-router dev",
  "build": "react-router build && tsx scripts/postbuild.ts",
  "preview": "npx serve build/client",
  "typecheck": "react-router typegen && tsc",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "og": "tsx scripts/og.ts"
  ```
  (`scripts/postbuild.ts` is created in Task 14; until then create it as `export {}` so build passes.)
- [ ] Step 3: `tsconfig.json` — copy ATS's (`~/Documents/GitHub/ats_website/tsconfig.json`), add `"resolveJsonModule": true`, `"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`.
- [ ] Step 4: `vite.config.ts` identical to ATS (tailwindcss() + reactRouter(), port 3000). `react-router.config.ts`: `{ ssr: false, prerender: ['/'] }` for now (Task 8 replaces with the full list).
- [ ] Step 5: `vitest.config.ts`: `environment: 'jsdom'`, `globals: true`, `setupFiles: ['tests/setup.ts']` (imports `@testing-library/jest-dom/vitest`), `include: ['tests/**/*.test.{ts,tsx}']`. Exclude `e2e/`.
- [ ] Step 6: `app/root.tsx` with `Layout` importing the three fontsource CSS files and `./theme.css` (empty file for now). `.env.example`:
  ```
  VITE_WHATSAPP_NUMBER=91XXXXXXXXXX
  VITE_GA_ID=G-XXXXXXXXXX
  VITE_CLARITY_ID=xxxxxxxxxx
  VITE_LEADS_SCRIPT_URL=https://script.google.com/macros/s/REPLACE/exec
  ```
- [ ] Step 7: `.gitignore`: `node_modules`, `build`, `.react-router`, `.env`, `.env.*.local`, `test-results`, `playwright-report`, `.DS_Store`.
- [ ] Step 8: `CLAUDE.md` from `~/Documents/GitHub/CLAUDE-template.md`, filled for this repo (stack, commands, the Global Constraints above, "catalogue.json is the price source", "no em-dashes", link to spec + plans).
- [ ] Step 9: Verify: `npm run typecheck && npm run build && npm test` → all pass (one trivial test in `tests/smoke.test.ts` asserting `1+1`).

### Task 2: Theme tokens, root shell, header/footer, logo, theme toggle

**Files:** Create `app/theme.css`, `app/components/Logo.tsx`, `app/components/ThemeToggle.tsx`, `app/components/SiteHeader.tsx`, `app/components/SiteFooter.tsx`; modify `app/root.tsx`. Test `tests/theme.test.tsx`.

**Produces:**
- Tailwind classes from tokens: `bg-ground bg-surface border-line border-line-strong text-ink text-ink-2 text-muted text-muted-2 text-accent bg-accent`, fonts `font-display font-sans font-mono`, utilities `.display-1 .display-2 .display-3 .label-mono .chrome-text .btn .btn-primary .btn-secondary .pill .card .reveal`.
- `Mark({ size?: number; className?: string })`, `Wordmark()`, `Lockup()` in `Logo.tsx`. Mark SVG exactly: `<path d="M 18 18 H 50 A 32 32 0 0 1 82 50 V 82 H 18 Z" fill="currentColor"/><circle cx="34" cy="66" r="8" class="fill-accent"/>` viewBox `0 0 100 100`.
- `useTheme(): { isLight: boolean; toggle(): void }` exported from `ThemeToggle.tsx`; `ThemeToggle` button with `aria-label`.
- `SiteHeader({ isLight, onToggleTheme })`, `SiteFooter()`.

- [ ] Step 1: `theme.css` tokens (spec §2): `:root` dark values, `.light` light values, `@custom-variant light (&:where(.light, .light *));`, `@theme inline` mapping `--color-*` and `--font-display: 'Bricolage Grotesque Variable'`, `--font-sans: 'Geist Variable'`, `--font-mono: 'JetBrains Mono'`. Chrome gradient as `--chrome` (dark) and `--chrome` under `.light` (steel). Type classes: `.display-1` = `clamp(3.5rem, 8.6vw, 8rem)`, weight 600, `font-variation-settings:'opsz' 96`, tracking −0.045em, line-height 0.92; `.display-2` = `clamp(2.25rem, 4.6vw, 4.5rem)`; `.display-3` = `1.75rem`; `.label-mono` as ATS but accent colour optional via `.label-mono.is-accent`. `.chrome-text` = `background: var(--chrome); -webkit-background-clip:text; background-clip:text; color:transparent`. `.btn` pill, 48px, `.btn-primary` = `bg-ink text-ground`, `.btn-secondary` = `border-line-strong text-ink`. `.reveal` = opacity 0 / translateY(12px) → `.is-visible` 500ms `--ease-out-expo`, disabled under reduced motion. Focus ring: `outline: 2px solid var(--accent)`.
- [ ] Step 2: `root.tsx`: `THEME_INIT` inline script:
  ```js
  (function(){try{var t=localStorage.getItem('theme');var l=t==='light'||(!t&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',l);}catch(e){}})();
  ```
  `useTheme` reads the class on mount; `toggle()` flips class and wraps `localStorage.setItem` in try/catch. Layout: skip link, `<SiteHeader/>`, `<main id="main">`, `<SiteFooter/>`, `<ScrollRestoration/>`, `<Scripts/>`. ErrorBoundary renders a 404-style page.
- [ ] Step 3: `SiteHeader`: fixed, blur on scroll (ATS pattern), nav `Services · Work · Lab · Journal · Pricing · About`, `ThemeToggle`, WhatsApp button (uses `waLink` from Task 4 — until then, link to `/contact`), primary `Book a call` → `/contact`. Mobile: full-screen menu, Escape closes, focus returns to toggle, body scroll locked (copy ATS logic).
- [ ] Step 4: `SiteFooter`: three columns (Services list from catalogue in Task 3 — for now static; Studio: Work/Lab/Journal/About/Contact; Legal: Terms/Privacy/Refunds), bottom row `© 2024–2026 Tech Pravaha · Beautiful things, shipped.` and `Need a system behind it? → Appropriate Tech Solutions` linking `https://appropriatetechsolutions.com`.
- [ ] Step 5: Test `tests/theme.test.tsx`: (a) `Mark` renders an `svg` with the exact path `d`; (b) `useTheme().toggle()` adds/removes `light` on `document.documentElement`; (c) with `Storage.prototype.setItem` mocked to throw, `toggle()` still flips the class and does not throw. Run `npm test` → pass; `npm run typecheck` → pass.

### Task 3: Catalogue data and loader

**Files:** Create `catalogue.json`, `app/lib/catalogue.ts`; test `tests/catalogue.test.ts`.

**Produces:**
```ts
export interface Tier { id: string; name: 'Launch'|'Growth'|'Bespoke'|string; label: string; tagline: string; price: number|null; from?: number; buyable: boolean; weeks?: number; days?: number; badge?: string|null; includes: string[]; terms?: string }
export interface Service { id: string; name: string; short: string; route: string; order: number; tiers: Tier[] }
export interface Catalogue { currency: 'INR'; gst: number; services: Service[]; addons: Addon[] }
export const catalogue: Catalogue;            // validated at import
export function validateCatalogue(c: unknown): Catalogue; // throws Error('catalogue: …')
export function getService(id: string): Service | undefined;
export function getTier(tierId: string): { service: Service; tier: Tier } | undefined;
export function formatINR(n: number): string;  // 35000 → '₹35,000' (en-IN grouping)
export function withGst(n: number, gst = catalogue.gst): number; // 35000 → 41300
export function tierFromPrice(t: Tier): number | null; // price ?? from ?? null
```

- [ ] Step 1: Write `catalogue.json` with the six services and prices from spec §4. Tier `label` is the display name (e.g. "Prototype", "Assistant", "Setup", "Starter", "Audit") and `name` the tier slot (Launch/Growth/Bespoke). Each tier has 4–6 `includes` lines (spec §3 table) and `weeks`/`days`. Bespoke tiers: `price: null, from: <n>, buyable: false`. Growth tiers for Apps MVP and AI Call centre: `price: null, from: <n>, buyable: false` with `terms: "Scoped on a call, fixed price before we start"`. Addon `care`: `{ id, name, from: 5000, per: 'month', buyable: false, blurb }`.
- [ ] Step 2: Failing tests: valid file passes; buyable tier with `price: null` throws `/catalogue: tier .* buyable without price/`; duplicate tier ids throw `/duplicate tier id/`; `formatINR(1250000) === '₹12,50,000'`; `withGst(35000) === 41300`; `getTier('websites-launch')!.service.id === 'websites'`.
- [ ] Step 3: Implement `validateCatalogue` (plain checks, no library), `formatINR` via `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })`.
- [ ] Step 4: `npm test` → pass.

### Task 4: Site constants, meta builder, JSON-LD, WhatsApp, analytics

**Files:** Create `app/lib/site.ts`, `app/lib/schema.ts`, `app/lib/whatsapp.ts`, `app/lib/analytics.ts`, `app/components/ui/JsonLd.tsx`; tests `tests/site.test.ts`, `tests/schema.test.ts`, `tests/whatsapp.test.ts`.

**Produces:**
```ts
// site.ts
export const SITE_URL = 'https://techpravaha.com'; export const SITE_NAME = 'Tech Pravaha';
export const TAGLINE = 'Beautiful things, shipped.'; export const ATS_URL = 'https://appropriatetechsolutions.com';
export const CONTACT_EMAIL = 'hello@techpravaha.com'; export const BOOKING_URL = import.meta.env.VITE_BOOKING_URL ?? '/contact';
export function pageMeta(p: { title: string; description: string; path: string; image?: string; noindex?: boolean }): MetaDescriptor[];
// schema.ts
export function organizationSchema(): object;
export function serviceSchema(service: Service): object;        // Service + hasOfferCatalog with Offer per tier (price in INR, ex-GST)
export function faqSchema(items: { q: string; a: string }[]): object;
export function breadcrumbSchema(crumbs: { name: string; path: string }[]): object;
export function articleSchema(post: { title: string; date: string; summary: string; slug: string }): object;
// whatsapp.ts
export const WHATSAPP_NUMBER: string; // from VITE_WHATSAPP_NUMBER, digits only, '' when unset/placeholder
export function waLink(message: string): string; // https://wa.me/<n>?text=<enc> or '/contact' when number unset
export function tierMessage(serviceName: string, tierLabel: string, price: number|null): string;
// analytics.ts
export type EventName = 'view_tier'|'begin_checkout'|'purchase'|'whatsapp_click'|'book_click'|'lead_submit'|'lab_play';
export function track(name: EventName, params?: Record<string, string|number>): void; // no-op without gtag
export function loadAnalytics(): void; // injects GA4 + Clarity when ids set; idempotent; called after idle from root
```

- [ ] Step 1: Tests first: `pageMeta` returns canonical `https://techpravaha.com/services/websites`, title `X | Tech Pravaha` except on `/`; `noindex:true` adds `{ name:'robots', content:'noindex' }`. `waLink('hi')` with number `919999999999` → `https://wa.me/919999999999?text=hi`; with env unset or `91XXXXXXXXXX` → `/contact`. `serviceSchema` includes one `Offer` per tier with `price` and `priceCurrency:'INR'`, and omits price for `price:null` tiers (uses `priceSpecification` with `minPrice` from `from`). `faqSchema` shape `FAQPage` with `mainEntity[]`.
- [ ] Step 2: Implement; `pageMeta` copied from ATS `lib/site.ts` with TP constants. `JsonLd({ data })` renders `<script type="application/ld+json">` with `JSON.stringify`.
- [ ] Step 3: Root: add `organizationSchema()` via `JsonLd` in `<head>`, and `useEffect` → `loadAnalytics()` on idle (`requestIdleCallback` fallback `setTimeout 3000`). Header WhatsApp button now uses `waLink('Hi Tech Pravaha, I found you on ' + path)` and `track('whatsapp_click', { page })`.
- [ ] Step 4: `npm test && npm run typecheck`.

### Task 5: UI primitives, motion, styleguide route

**Files:** Create `app/components/ui/{Button,Pill,Eyebrow,Section,Reveal,Counter,Faq}.tsx`, `app/components/{TierCard,ServiceCard,WorkCard,LabCard,Steps,Testimonials,WhatsAppCta,ChromeText}.tsx`, `app/routes/styleguide.tsx`; add to `routes.ts`; tests `tests/tiercard.test.tsx`, `tests/faq.test.tsx`.

**Interfaces:**
```ts
Button({ to?|href?, variant?: 'primary'|'secondary'|'ghost', size?: 'md'|'lg', children, onClick?, ariaLabel? })  // <Link> for internal, <a> for external; magnetic hover via motion (translate ≤ 4px), scale 0.98 on press
Pill({ children, tone?: 'line'|'accent' })
Eyebrow({ children, dot?: boolean })               // label-mono, optional accent dot
Section({ id?, eyebrow?, title?, intro?, children, className? })  // max-w-[1280px] px-6 py-20 md:py-28
Reveal({ children, delay?, as? })                   // motion.div whileInView once, y:12→0, opacity, 0.5s, respects reduced motion (useReducedMotion)
Counter({ to: number, suffix?, duration?: 1.2 })    // animates when in view; renders final value immediately under reduced motion or SSR
Faq({ items: {q,a}[] })                             // native <details>/<summary>, emits faqSchema via JsonLd
TierCard({ service, tier, cta: 'whatsapp'|'checkout' })  // price block: formatINR(price) + '+18% GST' or 'From ' + formatINR(from); badge; includes list with accent ticks; CTA: buyable → Button to waLink(tierMessage(...)) with track('view_tier') on mount + track('whatsapp_click') on click; non-buyable → 'Get a quote' → /contact?tier=<id>
ServiceCard({ service })                            // name, short, 'from ₹…' = min over tiers of tierFromPrice, arrow link
WorkCard({ item }) LabCard({ item })                // from content types in Task 6
Steps({ steps: {n,title,body}[] })                  // 4-up grid, animated tracing line (motion path) across the top on desktop
Testimonials({ items })                             // returns null when items.length < 2
WhatsAppCta({ message, label?, page })              // Button secondary with WhatsApp icon; falls back to /contact
ChromeText({ as?: 'h1'|'span', children, className? })  // .chrome-text + subtle sheen keyframe (background-position), off under reduced motion
```

- [ ] Step 1: Tests: `TierCard` for a buyable tier renders `₹35,000`, `+18% GST`, and an `<a href^="https://wa.me/">` when the number is set, `/contact` when not; for a `price:null` tier renders `From ₹2,50,000` and a link to `/contact?tier=apps-growth`. `Faq` renders `<details>` per item and a `FAQPage` JSON-LD script.
- [ ] Step 2: Implement all components with token classes only; icons from Phosphor (`WhatsappLogo`, `ArrowUpRight`, `Check`, `Sun`, `Moon`, `List`, `X`).
- [ ] Step 3: `/styleguide` route (noindex): swatches from tokens, type scale, buttons, pills, a TierCard in both states, Faq, Steps, Counter. Used for visual QA in both themes.
- [ ] Step 4: `npm test && npm run typecheck`; `npm run dev` and eyeball `/styleguide` in dark and light (toggle) — fix any hard-coded colours.

### Task 6: Content data — services, work, lab, testimonials

**Files:** Create `app/content/services.ts`, `app/content/work.ts`, `app/content/lab.ts`, `app/content/testimonials.ts`; copy lab apps into `public/lab/play/<slug>/index.html`; test `tests/content.test.ts`.

**Interfaces:**
```ts
// services.ts — keyed by catalogue service id; validated against catalogue in test
export interface ServiceContent { id: string; h1: string; subline: string; facts: { label: string; value: string }[]; afterPay: { n: string; title: string; body: string }[]; faq: { q: string; a: string }[]; related: string[] /* work slugs */; metaTitle: string; metaDescription: string }
export const SERVICES: Record<string, ServiceContent>;
// work.ts
export interface WorkItem { slug: string; name: string; client?: string; track: 'launched'; oneLiner: string; problem: string; shipped: string[]; stack: string[]; timeline: string; images: string[]; services: string[]; featured?: boolean }
export const WORK: WorkItem[];   // exhibition-app, qui-ambassador-app, home-manager, intpro
// lab.ts
export interface LabItem { slug: string; name: string; blurb: string; kind: 'play'|'extension'|'pwa'; href: string /* /lab/play/<slug>/ or external */; tags: string[] }
export const LAB: LabItem[];
// testimonials.ts
export interface Testimonial { quote: string; name: string; role?: string; company?: string; country?: string; service?: string; date?: string; source: 'upwork'|'direct'; sourceUrl?: string }
export const TESTIMONIALS: Testimonial[] = [];  // intentionally empty until Yogesh supplies real ones
```

- [ ] Step 1: Write `SERVICES` for all six (voice rules apply): H1s of the form "A website that looks like you meant it." / "An app your customers actually open." / "An AI front door that answers at 2am." / "WhatsApp that sells while you sleep." / "Content that ships every week without you." / "Design that makes the product obvious."; 4 facts each (timeline, stack, includes, payment); 4 afterPay steps (spec §3: receipt + intake form, kickoff call, design in the open, launch + handover); 5–7 FAQs each (GST, revisions, who builds it, what if scope grows, ownership of code/accounts, timelines, payment split).
- [ ] Step 2: `WORK`: Exhibition App (Flutter + Firebase attendee app with QR check-in, admin web; client named "exhibition organiser" until Yogesh confirms the name), Qui Ambassador App (Qui Tequila, Flutter, dashboard-first for ambassadors), Home Manager (React + Node + Google Sheets), IntPro (in progress; India-first SaaS for interior studios; WhatsApp-link client dashboard). `images` point to `/work/<slug>/1.png` etc. — **create `public/work/<slug>/` with a 1600×1000 placeholder SVG-rendered PNG per item stating "[screenshot pending]"** so layout is testable; Yogesh replaces files (listed in the morning notes).
- [ ] Step 3: Lab: copy these single-file apps into `public/lab/play/<slug>/index.html`: from `~/Downloads/newproducts/`: `meeting-meter`, `split-the-awkward`, `landlord-translator`, `chai-break`, `queue-quest`, `excuse-engine`; from `~/Documents/ChatGPT/Fun/plot-twist/` (copy the folder). Add external cards for `tab-tamer`, `localelens`, `should-i-buy-this` (kind `extension`, href `#` until store links exist, shown with "Chrome extension · source on request") and `afterbuy`, `goodfind`, `homefind` (kind `pwa`). Add `<meta name="robots" content="index">` untouched; do not modify app code.
- [ ] Step 4: Test: every catalogue service id has `SERVICES[id]`; every `related` slug exists in `WORK`; work slugs unique; every `LAB` item with `kind:'play'` has a file at `public/lab/play/<slug>/index.html` (fs check).
- [ ] Step 5: `npm test`.

### Task 7: Home route

**Files:** Create `app/routes/home.tsx` (replace placeholder). Test `tests/home.test.tsx` (renders H1 text and six ServiceCards).

- [ ] Step 1: Sections in spec §3 order. Hero: `Eyebrow dot` "Design & build studio · India" → `<h1 className="display-1">` wrapped by `MetallicHero` (Task 12; until then `ChromeText`) with `Beautiful things,<br/>shipped.` → subline "Websites, apps, AI call centres and WhatsApp automation. Designed properly, live in weeks, priced upfront. Pick a package or ask for bespoke." → Buttons `See packages` (/pricing) + `See the work` (/work) → service Pills.
- [ ] Step 2: Trust strip (three mono items from spec) · Services grid (6 `ServiceCard`) · Featured work (3 `WorkCard` where `featured`) · Lab teaser (3 `LabCard` + "Play all") · How it works (`Steps` with Discover · Design · Build · Launch, each one sentence) · `Testimonials` · Final CTA section with `Button` Book a call + `WhatsAppCta`.
- [ ] Step 3: `meta` via `pageMeta({ title: 'Tech Pravaha | Beautiful things, shipped.', description: 'A design and build studio for things you launch: websites, apps, AI front doors and WhatsApp automation. Delivered in weeks at a price you can see.', path: '/' })`.
- [ ] Step 4: `npm test && npm run typecheck`; dev-server eyeball both themes and at 375px width.

### Task 8: Services index, service page template, pricing

**Files:** Create `app/routes/services.tsx`, `app/routes/services.$slug.tsx`, `app/routes/pricing.tsx`; modify `app/routes.ts`, `react-router.config.ts` (full prerender list from catalogue + static routes). Test `tests/services.test.tsx`.

- [ ] Step 1: `routes.ts` full table: `/`, `services`, `services/:slug`, `pricing`, `work`, `work/:slug`, `lab`, `journal`, `journal/:slug`, `about`, `contact`, `terms`, `privacy`, `refunds`, `styleguide`, `404`, `*`. `react-router.config.ts` prerender: static list + `catalogue.services.map(s => s.route)` + `WORK.map(w => '/work/' + w.slug)` + journal slugs (Task 10 exports `JOURNAL_SLUGS` from `app/lib/journal.ts`; import it).
- [ ] Step 2: `services.$slug.tsx`: `loader`-free; read `useParams().slug`, `getService(slug)` + `SERVICES[slug]`; unknown → `throw data(null, { status: 404 })`. Layout: breadcrumb (`BreadcrumbList` schema) → H1/subline/facts rail → `Section` "Pick a package" with 3 `TierCard`s (`cta:'whatsapp'`) and the GST/Razorpay note → "What happens after you pay" `Steps` → `Faq` → Related work → CTA. `meta` from content; `JsonLd` with `serviceSchema`.
- [ ] Step 3: `pricing.tsx`: every service as a block with its three tiers; sticky in-page nav of service names; "Care" add-on card; FAQ (payment split, GST, refunds). `services.tsx`: six cards with sublines.
- [ ] Step 4: Test: rendering `/services/websites` shows H1 and three tier cards; unknown slug returns a 404 element.
- [ ] Step 5: `npm run build` → confirm `build/client/services/websites/index.html` contains the price string `₹35,000` and the `Service` JSON-LD.

### Task 9: Work and Lab routes

**Files:** Create `app/routes/work.tsx`, `app/routes/work.$slug.tsx`, `app/routes/lab.tsx`. Test `tests/work.test.tsx`.

- [ ] Step 1: `/work`: intro line ("Launched for clients, and a few things we built because we wanted them to exist."), grid of `WorkCard`s; footer note linking ATS for operational systems.
- [ ] Step 2: `/work/:slug`: hero (name, client/descriptor, oneLiner), problem paragraph, "What shipped" list, stack pills, timeline, images in a 2-col grid with `loading="lazy"` and alt text; related services (links to `/services/<id>`); unknown slug → 404 `data()`.
- [ ] Step 3: `/lab`: intro ("Small, finished things. Open one, play for a minute, close it when it's your turn."), filter pills by kind (client state), `LabCard`s; `kind:'play'` cards open `href` in a new tab and `track('lab_play', { slug })`.
- [ ] Step 4: Test: `/work/exhibition-app` renders its H1; `/lab` renders a card per `LAB` entry.
- [ ] Step 5: `npm test && npm run typecheck`.

### Task 10: Journal (markdown loader, seed posts, routes)

**Files:** Create `app/lib/journal.ts`, `app/content/journal/2026-10-10-why-fixed-prices.md`, `app/content/journal/2026-10-10-what-a-landing-page-needs.md`, `app/content/journal/2026-10-10-whatsapp-first-business.md`, `app/routes/journal.tsx`, `app/routes/journal.$slug.tsx`. Test `tests/journal.test.ts`.

**Produces:**
```ts
export interface Post { slug: string; title: string; date: string /* YYYY-MM-DD */; summary: string; tags: string[]; html: string; readingMinutes: number }
export const POSTS: Post[];          // sorted desc by date, built at import via import.meta.glob('../content/journal/*.md', { query:'?raw', import:'default', eager:true })
export const JOURNAL_SLUGS: string[];
export function parseFrontmatter(raw: string): { data: Record<string,string|string[]>; body: string }; // '---' block, key: value, tags as comma list; throws Error('journal: missing title/date in <file>') or on invalid date
```

- [ ] Step 1: Tests: parses a sample; throws on missing `date`; throws on `date: 32-13-2026`; `POSTS[0].date >= POSTS[1].date`; `readingMinutes` ≥ 1.
- [ ] Step 2: Implement with `marked` (`marked.parse(body)`), slug = filename minus date prefix and `.md`.
- [ ] Step 3: Seed posts, 400–600 words each, in the house voice, no em-dashes: (1) *Why we put prices on the website*; (2) *What a landing page actually needs (and what it doesn't)*; (3) *Running a business from WhatsApp without losing your mind*.
- [ ] Step 4: `/journal` list (title, date, summary, tags) and `/journal/:slug` (prose styles via Tailwind classes on a `.prose-tp` wrapper defined in `theme.css`; `articleSchema`; prev/next links). Add `rel="alternate" type="application/rss+xml" href="/rss.xml"` in root `links`.
- [ ] Step 5: `npm test && npm run typecheck`.

### Task 11: About, Contact (form + WhatsApp), legal pages, 404

**Files:** Create `app/routes/about.tsx`, `app/routes/contact.tsx`, `app/components/ContactForm.tsx`, `app/services/leads.ts`, `app/routes/terms.tsx`, `app/routes/privacy.tsx`, `app/routes/refunds.tsx`, `app/routes/not-found.tsx`, `app/routes/catchall.tsx`. Test `tests/contact.test.tsx`.

- [ ] Step 1: `leads.ts`: `submitLead(data: { name: string; email: string; phone?: string; message: string; tier?: string; page: string; type: 'contact' }): Promise<{ ok: boolean }>` POSTing JSON to `import.meta.env.VITE_LEADS_SCRIPT_URL` with `mode:'no-cors'` (ATS pattern); when the URL is unset, resolve `{ ok:false }` and the form shows the WhatsApp fallback.
- [ ] Step 2: `ContactForm`: name/email/phone/message + hidden `tier` from `?tier=` query (prefills message "I'd like a quote for <service> · <tier>"); client validation; on success `track('lead_submit')` and a thank-you state; on failure show "Message didn't send. WhatsApp us instead →".
- [ ] Step 3: `/contact`: WhatsApp first (big `WhatsAppCta`), then the form, then "Prefer a call?" `Button` to `BOOKING_URL`, then email. `/about`: founder paragraph (Yogesh Laddha, ten years building operational systems; ATS for the deep work, Tech Pravaha for things that launch), how we work (fixed scope, fixed price, kickoff date on the invoice, you own the code and accounts), the ATS cross-link block.
- [ ] Step 4: Legal pages, plain prose, India-specific, written for Razorpay's activation checklist: **Terms** (scope, payment terms incl. 50/50 on Growth, revisions, IP transfers on final payment, GST, governing law India); **Privacy** (what the form and analytics collect, GA4 + Clarity named, no sale of data, contact email); **Refunds & cancellation** (full refund before the kickoff call; after kickoff, refund minus work completed at the tier's day rate; refunds to the original method within 7–10 working days via Razorpay). Each page carries a "last updated" date.
- [ ] Step 5: 404 page with search-free helpful links; `catchall.tsx` renders it with status 404 (ATS pattern).
- [ ] Step 6: Test: form with empty email shows a validation message; with `?tier=websites-launch` the message prefills. `npm test && npm run typecheck`.

### Task 12: Metallic Paint hero

**Files:** Create `app/components/MetallicPaint.tsx` (TS port of the vendored source at `<scratchpad>/vendor-metallic/MetallicPaint.jsx` — also copy the LICENSE as `app/components/MetallicPaint.LICENSE.md`), `app/components/MetallicHero.tsx`, `app/lib/rasterText.ts`; modify `app/routes/home.tsx`. Test `tests/metallic.test.tsx`.

**Interfaces:**
```ts
export function rasterText(opts: { text: string; font: string; lineHeight: number; maxWidth: number; padding?: number }): string | null; // data:image/png — draws black text on transparent via OffscreenCanvas/HTMLCanvasElement after document.fonts.ready; null when canvas unavailable
export function canRunMetallic(): boolean;  // webgl2 present && !prefers-reduced-motion && innerWidth >= 768
export function MetallicHero({ children: ReactNode /* the H1 */ }): JSX.Element; // renders <ChromeText> always; when canRunMetallic() mounts <MetallicPaint> absolutely over it after idle, hiding the text visually (aria kept)
```

- [ ] Step 1: Port: rename to `.tsx`, type refs (`HTMLCanvasElement`, `WebGL2RenderingContext`), props interface with the defaults from the source, remove `'use client'`, inline the one CSS rule, keep the shader strings verbatim. Params for TP: `lightColor '#FFFFFF'`, `darkColor '#0A0A0C'`, `tintColor '#C9CCD6'` (chrome, not pink), `speed 0.25`, `liquid 0.6`, `refraction 0.012`, `contrast 0.55`, `brightness 1.9`; light theme passes `darkColor '#2A2D36'`.
- [ ] Step 2: Tests: `canRunMetallic()` false when `HTMLCanvasElement.prototype.getContext` returns null; false when `matchMedia('(prefers-reduced-motion: reduce)').matches`; false at `innerWidth 375`; `MetallicHero` always renders the children text in the DOM.
- [ ] Step 3: Wire into `home.tsx` hero; lazy-load `MetallicPaint` with `React.lazy` so the shader is not in the main chunk.
- [ ] Step 4: Manual: dev server on desktop → liquid chrome tagline animates, no console errors; narrow the window < 768px and reload → static chrome text. `npm test && npm run typecheck`.

### Task 13: Motion pass and theme QA

**Files:** Modify components/routes as needed; no new files except `tests/a11y-motion.test.tsx`.

- [ ] Step 1: Walk every route in dev at 1440 and 375 in both themes; ensure: reveals stagger by 60ms within a grid (`Reveal delay={i*60}`), card hover lifts 2px/150ms, trust-strip `Counter`s run once, `Steps` tracing line draws on view, header blur transition, no layout shift (check with DevTools "Layout Shift Regions").
- [ ] Step 2: Under `prefers-reduced-motion: reduce` (DevTools rendering panel): no transforms animate, counters show final values, hero is static.
- [ ] Step 3: Test: `Reveal` renders children with `opacity` style unaffected when `useReducedMotion()` is mocked true; `Counter` renders the final value immediately under reduced motion.
- [ ] Step 4: Contrast check with the axe DevTools extension or `npx @axe-core/cli http://localhost:3000` on `/`, `/services/websites`, `/pricing` in both themes → 0 violations.

### Task 14: SEO + analytics finishing: sitemap, RSS, OG images, headers, robots

**Files:** Create `scripts/postbuild.ts`, `scripts/og.ts`, `scripts/og-template.html`, `public/_headers`, `public/_redirects`, `public/robots.txt`, `public/favicons/*` (generated from the Mark SVG: `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png`, `icon-512.png`, `site.webmanifest`), `public/og/*.png`. Test `tests/postbuild.test.ts`.

- [ ] Step 1: `postbuild.ts`: build the URL list from the same sources as `react-router.config.ts` (export a shared `PRERENDER_PATHS` from `app/lib/routes-list.ts` used by both), write `build/client/sitemap.xml` (lastmod = today; journal posts use their date) and `build/client/rss.xml` from `POSTS`. Exclude `/styleguide`, `/404`. Test: generated XML contains `<loc>https://techpravaha.com/services/websites</loc>` and no `/styleguide`.
- [ ] Step 2: `og.ts`: launches Playwright chromium, opens `scripts/og-template.html?title=…&eyebrow=…` served from file, screenshots 1200×630 to `public/og/<name>.png` for: default, each service, pricing, work, lab, journal. Template uses the brand tokens and the Mark at 48px. Commit the PNGs (they are static assets).
- [ ] Step 3: `_headers` from ATS (`nosniff`, `SAMEORIGIN`, referrer policy, permissions policy, immutable `/assets/*`, cache `/og/*`, `/favicons/*`, `/lab/play/*` 1 day). `_redirects`: `/services/ai-systems /services/ai 301`, `/blog /journal 301`, `/blog/* /journal/:splat 301`. `robots.txt`: allow all, `Sitemap: https://techpravaha.com/sitemap.xml`, `Disallow: /styleguide`.
- [ ] Step 4: Favicons: write `public/favicons/favicon.svg` (Mark on ground) and render PNG sizes with Playwright in `og.ts` (same script, `--favicons` flag). Root `links()` lists them + `site.webmanifest` (name, short_name "Pravaha", theme_color `#0A0A0C`).
- [ ] Step 5: Analytics: confirm `loadAnalytics()` injects GA4 (`gtag/js?id=`) and Clarity only when ids are set; `track()` calls appear on: tier view, WhatsApp click, book click, lead submit, lab play (grep for each `track(` call site). `npm run build && npm test`.

### Task 15: E2E smoke, Lighthouse, README, final verification

**Files:** Create `playwright.config.ts`, `e2e/smoke.spec.ts`, `lighthouserc.json`; finish `README.md` and `CLAUDE.md`.

- [ ] Step 1: `playwright.config.ts`: `webServer: { command: 'npx serve build/client -l 4173', url: 'http://localhost:4173', reuseExistingServer: true }`, chromium only, `baseURL`.
- [ ] Step 2: `e2e/smoke.spec.ts`: for every path in `PRERENDER_PATHS` except `/404`: `expect(h1).toBeVisible()` and `expect(page).toHaveTitle(/Tech Pravaha/)`; `/services/websites` shows `₹35,000`; the header WhatsApp link href matches `/wa\.me|\/contact/`; theme toggle adds `light` to `<html>` and persists after reload; `/lab/play/meeting-meter/` returns 200.
- [ ] Step 3: `lighthouserc.json` with `collect.url` = home + `/services/websites`, `staticDistDir: build/client`, assertions: performance ≥ 0.9, seo = 1, accessibility ≥ 0.95, best-practices ≥ 0.9. Run `npx @lhci/cli autorun` and record the scores in the README.
- [ ] Step 4: README: stack, commands, env vars, where prices live and how to change them (GitHub web UI → merge → ~1 min), how to add a work item / lab app / journal post / testimonial, deployment (Cloudflare Pages: build `npm run build`, output `build/client`, env vars list), and the cutover checklist from spec §7.
- [ ] Step 5: Full verification: `npm run typecheck && npm test && npm run build && npm run test:e2e` all green. Then ONE commit on `feat/phase-1-foundation`: `feat: phase 1 foundation — brand, routes, catalogue, journal, lab, SEO`. Do not push until Yogesh has seen the morning notes (push is fine; merging is his).

---

## Morning notes for Yogesh (to be appended by the executor as items arise)

- Replace placeholder screenshots in `public/work/<slug>/`.
- Confirm the exhibition client's name for the Work page.
- Supply testimonials (Upwork profile URL or pasted feedback) → `app/content/testimonials.ts`.
- Set `VITE_WHATSAPP_NUMBER`, `VITE_GA_ID`, `VITE_CLARITY_ID`, `VITE_LEADS_SCRIPT_URL` (deploy an Apps Script like ATS's `scripts/google-apps-script.js` against a new "TP Leads" sheet) in Cloudflare Pages env.
- Decide booking link (`VITE_BOOKING_URL`: Google Calendar appointment schedule or Calendly).
- Hosted Chrome-extension links for Lab cards (or keep "source on request").
- Confirm or drop the 'Lighthouse 90+' line in the Websites Launch tier includes (catalogue.json).
- Testimonials section heading reads "Clients · In their words."; confirm or change (app/components/Testimonials.tsx).
- Exhibition App (Task 6): client shows as "Trade exhibition organiser, India" in `app/content/work.ts`. Confirm the organiser's name (the app's own docs mention the ALUMEX INDIA 2025 event) and whether it can be shown.
- Work timelines (Task 6): all four items read "[timeline pending]" (IntPro: "In progress · [timeline pending]"); no source states one. Supply build durations in `app/content/work.ts`.
- Work facts to confirm (Task 6): Qui Ambassador App's "shipped" list follows its V1 build document (dashboard, shifts, tasting events, expenses/activities, earnings, Cloud Run API in front of Sheets); remove anything not live. Work `services` tags and each service page's `related` list are in `app/content/{work,services}.ts`.
- Lab store links (Task 6): Tab Tamer, LocaleLens and Should I Buy This? (Chrome extensions) and AfterBuy, GoodFind, HomeFind (web apps) are `href: '#'` ("source on request"). Add Chrome Web Store / hosted URLs in `app/content/lab.ts` when they exist.
- Landlord Translator and Excuse Engine held back; they call api.anthropic.com directly. Decide whether to proxy them via the Worker in phase 3.
- Screenshots (Task 6): replace the SVG placeholders `public/work/<slug>/1.svg` and `2.svg` for exhibition-app, qui-ambassador-app, home-manager, intpro (any format; update `images` in `app/content/work.ts` if the extension changes).
- Revisions policy set to two rounds on every tier; confirm.
- WhatsApp FAQ (Task 6) states Meta's per-message charges are not part of the package price; confirm.
- Journal post 'Why we put prices on the website' says overruns inside a fixed scope are ours to absorb; confirm you want to say that.
- Legal pages (Task 11): replace the placeholders `[GSTIN]` and `[registered address]` (one place: `app/components/LegalPage.tsx`, shown on /terms). Razorpay's checklist also wants the registered address and a phone number on /contact; add them there when you have them.
- Legal pages (Task 11): jurisdiction city for disputes is `[city]` in `app/components/LegalPage.tsx`; set it (usually the city of the registered address).
- Refund formula (Task 11): /refunds says value of work completed = package price ÷ days in the timeline × calendar days from kickoff to cancellation (2 weeks = 14 days), capped at the price; refund = amount paid minus that, plus the GST on the refund, with a credit note. It also says no refund after launch and handover. Confirm calendar days vs working days and the rest.
- Legal clauses added beyond the brief's facts (Task 11), confirm or cut: timeline counts from kickoff and moves day-for-day while we wait on the client (Terms 5); client responsible for content rights and post-handover passwords (Terms 8); liability capped at the package price, third-party outages excluded (Terms 11); try to settle directly before court (Terms 12); payments clause in Privacy follows spec §5 (Razorpay sees card/UPI details, we receive name, email, phone, GSTIN). Razorpay may also ask for a "Shipping and delivery" page; Terms 2 says all work is delivered online and nothing is shipped. If they insist on a separate URL, add a `/delivery` route.
- Lead capture (Task 11): deploy an Apps Script (copy `ats_website/scripts/google-apps-script.js`) against a new private "TP Leads" sheet. It must accept `name, email, phone, message, tier, page, type` (body is JSON sent as text/plain). Set `VITE_LEADS_SCRIPT_URL` in Cloudflare Pages; until then the contact form shows the WhatsApp/email fallback on every submit.
- Booking (Task 11): /contact hides "Prefer a call?" while `VITE_BOOKING_URL` is unset (it would link to /contact itself).
- More legal clauses to confirm or cut (Task 11 fix round): phased quotes pro-rate the phase in progress (Refunds 5); "The Care add-on is invoiced monthly" (Terms 4); third-party fees passed on at cost where the quote says so (Terms 3); "the terms in force on the day you paid apply to that purchase" (Terms 13).
- Microsoft Clarity masking must stay on Balanced or Strict in the Clarity project settings, or the privacy line "does not record what you type into forms" stops being true.
- Refund formula: the Design Audit tier is "5 days" in catalogue.json while /refunds counts calendar days. Is that 5 calendar days or 5 working days?
- Terms 9 now says accounts are in your name from day one and ownership of the work transfers on full payment; confirm.
- Work (final-review fix): IntPro and Home Manager are attributed as 'Studio product'; confirm or name the client. Work cards and pages now show a status ("Live", or "In progress" for IntPro) instead of "Launched".
- Badges (final-review fix): the four Growth-tier badges now read "Recommended" instead of "Most chosen" (no order data yet to back "Most chosen"); switch back in `catalogue.json` once real orders support it.
- Contact page promises a reply within one working day; keep or change (`app/routes/contact.tsx` copy and meta description, `app/components/ContactForm.tsx`).
- Cut over only after phase 2 (checkout) is live, or soften the Razorpay/'at checkout' payment copy first (Terms 4, Privacy "Payments", Refunds 7, home trust strip, service-page payment note, pricing FAQ, catalogue "at checkout" payment lines). Also in the README cutover checklist.
- Timeline FAQ on every service page now follows Terms 5: "If something on your side takes longer, the launch date moves by the same number of days." Change both together if you change one.
- Split the Awkward held back with the other two API-calling apps; proxy via the Worker in phase 3? (It called api.anthropic.com from the browser with names, amounts and UPI ids; `tests/content.test.ts` now scans every lab file for AI API hosts and outside fetches.)
- Privacy: confirm the email provider and whether to name a grievance contact (IT Rules 2011 / DPDP). The privacy page now names Cloudflare (hosting, request logs) and says hello@techpravaha.com is a Google Workspace mailbox.
- AI and WhatsApp FAQs say model/telephony accounts and the Meta business account are in your name; confirm.
- ATS site has the same trailing-slash canonical bug (ats_website); separate PR. (Cloudflare Pages 308s `/x` to `/x/`; this site now emits `/x/` in canonicals, og:url, sitemap, RSS and JSON-LD.)
- Booking (final-review fix): with `VITE_BOOKING_URL` unset every "Book a call" button reads "Talk to us" and links to /contact (no event); set it and they open the booking page in a new tab and record `book_click { page }`.
- CI: `.github/workflows/ci.yml` runs typecheck, unit tests and build on every PR and push to main. Make it a required check on `main` in GitHub branch protection once the repo is pushed.
