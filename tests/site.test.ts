import { describe, expect, it } from 'vitest';
import { pageMeta, SITE_URL, siteUrl } from '../app/lib/site';

const find = (meta: ReturnType<typeof pageMeta>, key: string, val: string) =>
  meta.find((m) => (m as Record<string, unknown>)[key] === val) as Record<string, string> | undefined;

describe('pageMeta', () => {
  const m = pageMeta({ title: 'Websites', description: 'Sites that ship.', path: '/services/websites' });

  it('builds a trailing-slash canonical url and suffixed title', () => {
    expect(find(m, 'rel', 'canonical')?.href).toBe('https://techpravaha.com/services/websites/');
    expect(m[0]).toEqual({ title: 'Websites | Tech Pravaha' });
  });

  it('does not suffix the title on the home page', () => {
    const home = pageMeta({ title: 'Tech Pravaha', description: 'd', path: '/' });
    expect(home[0]).toEqual({ title: 'Tech Pravaha' });
    expect(find(home, 'rel', 'canonical')?.href).toBe(`${SITE_URL}/`);
  });

  it('includes description, open graph and twitter tags with the default image', () => {
    expect(find(m, 'name', 'description')?.content).toBe('Sites that ship.');
    expect(find(m, 'property', 'og:image')?.content).toBe('https://techpravaha.com/og/default.png');
    expect(find(m, 'name', 'twitter:card')?.content).toBe('summary_large_image');
    expect(find(m, 'property', 'og:url')?.content).toBe('https://techpravaha.com/services/websites/');
  });

  it('uses a page-specific image when given', () => {
    const img = pageMeta({ title: 'T', description: 'd', path: '/x', image: '/og/x.png' });
    expect(find(img, 'property', 'og:image')?.content).toBe('https://techpravaha.com/og/x.png');
  });

  it('adds robots noindex only when asked', () => {
    expect(find(m, 'name', 'robots')).toBeUndefined();
    const n = pageMeta({ title: 'T', description: 'd', path: '/x', noindex: true });
    expect(n).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});

describe('siteUrl', () => {
  it('keeps the root bare and ends every other path with a slash', () => {
    expect(siteUrl('/')).toBe('https://techpravaha.com/');
    expect(siteUrl('/journal')).toBe('https://techpravaha.com/journal/');
    expect(siteUrl('/journal/')).toBe('https://techpravaha.com/journal/');
  });

  it('puts the slash before a fragment', () => {
    expect(siteUrl('/services/ai#ai-launch')).toBe('https://techpravaha.com/services/ai/#ai-launch');
  });
});
