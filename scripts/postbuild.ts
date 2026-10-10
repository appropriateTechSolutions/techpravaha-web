/**
 * Runs after `react-router build`: writes sitemap.xml and rss.xml, copies the
 * prerendered 404 page to 404.html (Cloudflare Pages serves it for unknown URLs),
 * and refuses to finish if a sitemap URL is missing or noindex. The sitemap also lists
 * the hosted products (`HOSTED_APP_PATHS`, static builds in `public/<slug>/`), which
 * must each have an index.html with a title and a meta description.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../app/lib/frontmatter';
import { hasPreloads, PRELOAD_SKIP_DIRS, stripPreloads } from './lib/html';
import { buildRss, buildSitemap, type FeedPost } from './lib/feeds';
import { HOSTED_APP_PATHS, NOINDEX_PATHS, prerenderPaths } from './lib/paths';

const ROOT = process.cwd();
const OUT = join(ROOT, 'build/client');
const JOURNAL_DIR = join(ROOT, 'app/content/journal');

function fail(message: string): never {
  console.error(`postbuild: ${message}`);
  process.exit(1);
}

function readPosts(): FeedPost[] {
  if (!existsSync(JOURNAL_DIR)) return [];
  return readdirSync(JOURNAL_DIR)
    .map((file) => {
      const slug = /^\d{4}-\d{2}-\d{2}-(.+)\.md$/.exec(file)?.[1];
      if (!slug) return null;
      const { data } = parseFrontmatter(readFileSync(join(JOURNAL_DIR, file), 'utf8'), file);
      if (typeof data.summary !== 'string' || !data.summary) fail(`missing summary in ${file}`);
      return { slug, title: data.title as string, date: data.date as string, summary: data.summary };
    })
    .filter((p): p is FeedPost => p !== null)
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

/** Prerendered file for a path: `/` is index.html, `/about` is about/index.html. */
function htmlFor(path: string): string {
  return join(OUT, path === '/' ? '' : path, 'index.html');
}

/**
 * React Router emits a modulepreload link for every route chunk. On slow
 * mobile links those ~350 KB of scripts compete with the CSS and fonts that
 * paint the already-prerendered HTML (Lighthouse mobile: FCP 3.6 s with them,
 * 2.1 s without). The module script still loads and hydrates the page.
 * Walks the build output (skipping PRELOAD_SKIP_DIRS: assets/, lab/play/ and the
 * hosted products) and returns the HTML
 * files it visited, so the caller can verify none still has a preload.
 */
function stripModulePreloads(dir: string, rel = ''): { pages: string[]; changed: number; links: number } {
  const result = { pages: [] as string[], changed: 0, links: 0 };
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (PRELOAD_SKIP_DIRS.includes(relPath)) continue;
      const sub = stripModulePreloads(full, relPath);
      result.pages.push(...sub.pages);
      result.changed += sub.changed;
      result.links += sub.links;
    } else if (entry.name.endsWith('.html')) {
      result.pages.push(full);
      const html = readFileSync(full, 'utf8');
      const out = stripPreloads(html);
      if (out !== html) {
        writeFileSync(full, out);
        result.changed += 1;
        result.links += (html.match(/<link\b[^>]*rel="modulepreload"[^>]*>/g) ?? []).length;
      }
    }
  }
  return result;
}

if (!existsSync(OUT)) fail(`${OUT} does not exist; run react-router build first`);

const today = new Date().toISOString().slice(0, 10);
const posts = readPosts();
const paths = [...prerenderPaths().filter((p) => !NOINDEX_PATHS.includes(p)), ...HOSTED_APP_PATHS];
const lastmod = Object.fromEntries(posts.map((p) => [`/journal/${p.slug}`, p.date]));

// Every URL we advertise must exist and be indexable.
const problems: string[] = [];
for (const p of paths) {
  const file = htmlFor(p);
  if (!existsSync(file)) {
    problems.push(`${p}: no prerendered ${file}`);
  } else {
    const html = readFileSync(file, 'utf8');
    if (/<meta[^>]+name="robots"[^>]*noindex/.test(html)) problems.push(`${p}: prerendered page is noindex`);
    if (HOSTED_APP_PATHS.includes(p)) {
      if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${p}: hosted app has no <title>`);
      if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) problems.push(`${p}: hosted app has no meta description`);
    }
  }
}
if (problems.length) fail(`sitemap check failed\n  ${problems.join('\n  ')}`);

mkdirSync(OUT, { recursive: true });
const stripped = stripModulePreloads(OUT);
writeFileSync(join(OUT, 'sitemap.xml'), buildSitemap(paths, lastmod, today));
writeFileSync(join(OUT, 'rss.xml'), buildRss(posts));

const notFound = join(OUT, '404/index.html');
if (!existsSync(notFound)) fail('build/client/404/index.html is missing');
copyFileSync(notFound, join(OUT, '404.html'));

// Gate: no site page (404.html included) may still carry a modulepreload link.
const leftovers = [...stripped.pages, join(OUT, '404.html')].filter((f) => hasPreloads(readFileSync(f, 'utf8')));
if (leftovers.length) fail(`modulepreload still present in\n  ${leftovers.join('\n  ')}`);

console.log(`postbuild: sitemap.xml (${paths.length} urls), rss.xml (${posts.length} posts), 404.html, ${stripped.links} modulepreload links stripped from ${stripped.changed} pages`);
