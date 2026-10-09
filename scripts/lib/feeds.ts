/** Pure XML builders for the post-build step (sitemap.xml, rss.xml). No fs, no Vite. */

export const SITE = 'https://techpravaha.com';

export interface FeedPost {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10-10` to `Sat, 10 Oct 2026 00:00:00 GMT` (RFC 822, pinned to UTC). */
export function rfc822(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${DAYS[d.getUTCDay()]}, ${dd} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} 00:00:00 GMT`;
}

/**
 * Every path ends with `/` (the root is just `/`). Cloudflare Pages serves `x/index.html`
 * at `/x/` and 308-redirects `/x`, so the slash form is the one that answers 200.
 * Mirrors `siteUrl` in app/lib/site.ts (which this Node script cannot import: it reads import.meta.env).
 */
export function pageUrl(path: string): string {
  return `${SITE}${path.replace(/\/+$/, '')}/`;
}

/** `lastmodByPath` overrides `today` for individual paths (journal posts use their date). */
export function buildSitemap(paths: string[], lastmodByPath: Record<string, string>, today: string): string {
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${escapeXml(pageUrl(p))}</loc>\n    <lastmod>${lastmodByPath[p] ?? today}</lastmod>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRss(posts: FeedPost[]): string {
  const items = posts
    .map((p) => {
      const link = escapeXml(pageUrl(`/journal/${p.slug}`));
      return `    <item>\n      <title>${escapeXml(p.title)}</title>\n      <link>${link}</link>\n      <guid isPermaLink="true">${link}</guid>\n      <pubDate>${rfc822(p.date)}</pubDate>\n      <description>${escapeXml(p.summary)}</description>\n    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Tech Pravaha Journal</title>\n    <link>${pageUrl('/journal')}</link>\n    <description>Notes from the studio: how we price, build and ship.</description>\n    <language>en-IN</language>\n    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`;
}
