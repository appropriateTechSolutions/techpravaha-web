/**
 * Node-side route list for prerendering (and, later, the sitemap).
 * Runs inside react-router.config.ts, so it reads files with `fs` and never
 * imports app modules that depend on Vite (import.meta.env, import.meta.glob).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Repo root: npm scripts, react-router and vitest all run from it. */
const ROOT = process.cwd();

export const STATIC_PATHS = [
  '/',
  '/services',
  '/pricing',
  '/work',
  '/lab',
  '/journal',
  '/about',
  '/contact',
  '/teardown',
  '/terms',
  '/privacy',
  '/refunds',
  '/styleguide',
  '/404',
];

interface RawCatalogue {
  services: { route: string; tiers: { id: string; buyable: boolean }[] }[];
}

function readCatalogue(): RawCatalogue {
  return JSON.parse(readFileSync(join(ROOT, 'catalogue.json'), 'utf8')) as RawCatalogue;
}

function serviceRoutes(): string[] {
  return readCatalogue().services.map((s) => s.route);
}

/** One checkout page per tier that can be bought online; quote-only tiers have none. */
function checkoutRoutes(): string[] {
  return readCatalogue()
    .services.flatMap((s) => s.tiers)
    .filter((t) => t.buyable)
    .map((t) => `/checkout/${t.id}`);
}

/** Post-purchase page; reads `?order=` in the browser. */
const THANKS_PATH = '/thanks';

/** Prerendered, but kept out of the sitemap and marked noindex. */
export const NOINDEX_PATHS = ['/styleguide', '/404', THANKS_PATH, ...checkoutRoutes()];

/** Slugs from `slug: '...'` entries in app/content/work.ts (text scan; no TS loader in Node). */
function workRoutes(): string[] {
  const src = readFileSync(join(ROOT, 'app/content/work.ts'), 'utf8');
  return [...src.matchAll(/\bslug:\s*['"]([a-z0-9-]+)['"]/g)].map((m) => `/work/${m[1]}`);
}

/** Journal posts are `YYYY-MM-DD-<slug>.md`; the directory may not exist yet. */
function journalRoutes(): string[] {
  const dir = join(ROOT, 'app/content/journal');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^\d{4}-\d{2}-\d{2}-(.+)\.md$/.exec(f)?.[1])
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => `/journal/${slug}`);
}

export function prerenderPaths(): string[] {
  return [
    ...new Set([
      ...STATIC_PATHS,
      ...serviceRoutes(),
      ...workRoutes(),
      ...journalRoutes(),
      ...checkoutRoutes(),
      THANKS_PATH,
    ]),
  ];
}
