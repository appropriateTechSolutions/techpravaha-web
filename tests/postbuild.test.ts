import { describe, expect, it } from 'vitest';
import { buildRss, buildSitemap, rfc822, SITE, type FeedPost } from '../scripts/lib/feeds';
import { hasPreloads, PRELOAD_SKIP_DIRS, stripPreloads } from '../scripts/lib/html';
import { NOINDEX_PATHS, prerenderPaths } from '../scripts/lib/paths';

const POSTS: FeedPost[] = [
  { slug: 'a-post', title: 'A post & more', date: '2026-10-08', summary: 'First <summary>.' },
  { slug: 'b-post', title: 'B post', date: '2026-10-10', summary: 'Second summary.' },
];

describe('buildSitemap', () => {
  const paths = ['/', '/services/websites', '/journal/a-post'];
  const xml = buildSitemap(paths, { '/journal/a-post': '2026-10-08' }, '2026-10-12');

  it('lists absolute locs that all end with a trailing slash (Pages serves dir/index.html at /x/)', () => {
    expect(xml).toContain('<loc>https://techpravaha.com/</loc>');
    expect(xml).toContain('<loc>https://techpravaha.com/services/websites/</loc>');
    expect(xml).not.toContain('websites</loc>');
    for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) expect(m[1]).toMatch(/\/$/);
  });

  it('uses the post date for journal posts and today for the rest', () => {
    expect(xml).toMatch(/\/journal\/a-post\/<\/loc>\s*<lastmod>2026-10-08<\/lastmod>/);
    expect(xml).toMatch(/\/services\/websites\/<\/loc>\s*<lastmod>2026-10-12<\/lastmod>/);
  });

  it('does not contain /styleguide or /404 when built from the real path list', () => {
    const real = prerenderPaths().filter((p) => !NOINDEX_PATHS.includes(p));
    const out = buildSitemap(real, {}, '2026-10-12');
    expect(out).not.toContain('/styleguide');
    expect(out).not.toContain('/404');
    expect(out).toContain(`<loc>${SITE}/services/websites/</loc>`);
    expect((out.match(/<loc>/g) ?? []).length).toBeGreaterThanOrEqual(24);
  });
});

describe('buildRss', () => {
  const xml = buildRss(POSTS);

  it('has the channel metadata and one item per post', () => {
    expect(xml).toContain('<title>Tech Pravaha Journal</title>');
    expect(xml).toContain('<link>https://techpravaha.com/journal/</link>');
    expect((xml.match(/<item>/g) ?? []).length).toBe(2);
    expect(xml).toContain('<guid isPermaLink="true">https://techpravaha.com/journal/a-post/</guid>');
    expect(xml).toContain('<link>https://techpravaha.com/journal/a-post/</link>');
  });

  it('escapes XML in titles and summaries', () => {
    expect(xml).toContain('<title>A post &amp; more</title>');
    expect(xml).toContain('<description>First &lt;summary&gt;.</description>');
  });

  it('writes RFC 822 pubDates', () => {
    expect(xml).toContain('<pubDate>Thu, 08 Oct 2026 00:00:00 GMT</pubDate>');
    expect(rfc822('2026-10-10')).toBe('Sat, 10 Oct 2026 00:00:00 GMT');
    for (const m of xml.matchAll(/<pubDate>(.*?)<\/pubDate>/g)) {
      expect(m[1]).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
    }
  });
});

describe('stripPreloads', () => {
  const html =
    '<head><title>x</title><link rel="modulepreload" href="/assets/a.js"/>' +
    '<link href="/assets/b.js" rel="modulepreload" crossorigin="">' +
    '<link rel="stylesheet" href="/assets/c.css"/><link rel="preload" as="font" href="/f.woff2"/></head>';

  it('removes modulepreload links in any attribute order and keeps other links', () => {
    const out = stripPreloads(html);
    expect(hasPreloads(html)).toBe(true);
    expect(hasPreloads(out)).toBe(false);
    expect(out).toContain('rel="stylesheet"');
    expect(out).toContain('rel="preload" as="font"');
    expect(out).toContain('<title>x</title>');
  });

  it('is a no-op on HTML without preloads', () => {
    expect(stripPreloads('<p>hi</p>')).toBe('<p>hi</p>');
  });

  it('skips only lab/play, so the /lab route page is processed', () => {
    expect(PRELOAD_SKIP_DIRS).toContain('lab/play');
    expect(PRELOAD_SKIP_DIRS).not.toContain('lab');
  });
});
