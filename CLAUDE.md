# Tech Pravaha website

Marketing site for Tech Pravaha, a design and build studio that sells packaged services (websites, apps, AI, WhatsApp automation, content, design) to Indian founders and SMBs. Stage: pre-launch build, phase 1 (foundation). Owner: Yogesh Laddha.

Spec: `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md` · Plans: `docs/superpowers/plans/`

## Architecture

- `app/routes/*`: one file per route; `app/routes.ts` is the route table.
- `app/components/*`, `app/lib/*`: UI and helpers. Tokens live only in `app/theme.css`.
- `app/content/{work,lab,testimonials,services}.ts` and `app/content/journal/*.md`: site content as data and markdown; `catalogue.json` (repo root) is the only price source.
- `public/lab/play/<slug>/index.html`: lab apps served as static files (no `/lab/:slug` route).
- `scripts/`: build-time scripts (`postbuild.ts`, `og.ts`); Node-side path lists live in `scripts/lib/paths.ts`.
- Phase 2 adds `workers/techpravaha-api` (Razorpay, Sheets, Resend). Not present yet.
- Sibling site: `~/Documents/GitHub/ats_website` (same approach, older toolchain: this repo is on Vite 8, TypeScript 6, Vitest 4). Copy patterns from it, do not share code.

## Stack

- Frontend: React 19, React Router 7 framework mode (`ssr: false` + prerender), Vite 8, TypeScript 6, Tailwind 4, `motion`, Phosphor icons.
- Fonts: Bricolage Grotesque (display 600), Geist (body), JetBrains Mono (labels), self-hosted via fontsource.
- Tests: Vitest 4 + Testing Library (unit), Playwright (e2e smoke on `build/client`), Lighthouse CI (`lighthouserc.json`, budget in README).
- Deployment: Cloudflare Pages, output `build/client`, no runtime server.

## Commands

```bash
npm run dev          # dev server, port 3000
npm run build        # prerender to build/client + postbuild
npm test             # all unit tests (vitest run)
npx vitest run tests/<file>.test.ts   # single test
npm run typecheck    # react-router typegen && tsc
npm run test:e2e     # playwright (run npm run build first)
npx @lhci/cli autorun  # Lighthouse budget (run npm run build first)
```

## Environment & secrets

- Copy `.env.example` to `.env`. Every new env var MUST be added to `.env.example` (dummy value) in the same commit.
- Never commit secrets, cookies, tokens. If one lands in git history, untracking is not enough: rotation and history scrub required.

## Global constraints

- Node >= 20, npm. Every route prerendered; no runtime server.
- No hard-coded hex outside `app/theme.css`. Components use Tailwind token classes (`bg-ground`, `text-ink`, `text-accent`).
- Dark is default (`:root`); light theme is `html.light`. Theme is set inline in `<head>` before paint, persisted in `localStorage('theme')`, `prefers-color-scheme` honoured on first visit.
- Accent (`#A8BD9A` dark, `#5A754E` light) is for signals only. Never a button fill.
- Type: Bricolage Grotesque display 600; Geist body; JetBrains Mono labels (uppercase, 0.1 to 0.14em tracking).
- Copy voice: short declarative lines; no superlatives; no em-dashes in visible copy or docs (use commas, full stops, or a middle dot).
- All motion respects `prefers-reduced-motion`; nothing over 600ms; no scroll-jacking.
- Prices display ex-GST with a "+18% GST" note. `catalogue.json` is the only price source; never hard-code a price in a component or in copy.
- Motion: the app is wrapped in `<LazyMotion features={domAnimation} strict>`. Use `m.*` from `motion/react`, never `motion.*` (strict mode throws). Never wrap above-the-fold or LCP content in `Reveal`.
- Build scripts (`scripts/*`) run in Node and read files with `fs`; they must not import Vite-only APIs (`import.meta.glob`, `import.meta.env`).
- `scripts/postbuild.ts` strips `modulepreload` links from the prerendered HTML on purpose (mobile FCP 3.6 s to 2.1 s); do not add them back without re-running Lighthouse.
- No invented facts: testimonials render only real entries (the file ships empty); no fake stats.
- Phase 1 "Buy" CTAs link to WhatsApp with a prefilled message naming the tier; phase 2 swaps them to `/checkout/<tierId>`.
- `react-router.config.ts` must never import Vite-only APIs. Browser code uses `import.meta.glob`; Node-side lists use `fs` in `scripts/lib/paths.ts`.
- Anything that needs Yogesh (real screenshots, testimonials, env ids) is a placeholder plus a line under "Morning notes for Yogesh" at the end of the plan file.

## Conventions

- Branches `feat/<slug>` off `main`. Conventional commits, imperative mood.
- Never push without being asked. Unpushed work on one laptop is a liability: mention it at wrap-up.
- No new dependency without a one-line justification in the commit that adds it.

## Definition of done

1. Exercised end-to-end (run the app / build), not just compiled.
2. `npm run typecheck`, `npm run build` and `npm test` run and their output read.
3. Docs touched (README, `.env.example`) updated in the same commit.
4. Anything not verified is reported as unverified.

## Don't

- Don't refactor beyond the task; flag adjacent problems instead.
- Don't delete or overwrite files you haven't read.
- Don't invent testimonials, stats, clients or prices.
