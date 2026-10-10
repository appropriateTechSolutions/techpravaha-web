import { describe, expect, it } from 'vitest';
import { NOINDEX_PATHS, STATIC_PATHS, prerenderPaths } from '../scripts/lib/paths';
import { catalogue } from '../app/lib/catalogue';
import { WORK } from '../app/content/work';

describe('prerenderPaths', () => {
  const paths = prerenderPaths();

  it('includes service and work detail pages', () => {
    expect(paths).toContain('/services/websites');
    expect(paths).toContain('/work/exhibition-app');
  });

  it('covers every catalogue service and every work item', () => {
    for (const s of catalogue.services) expect(paths).toContain(s.route);
    for (const w of WORK) expect(paths).toContain(`/work/${w.slug}`);
  });

  it('has no duplicates', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps every static route', () => {
    for (const p of STATIC_PATHS) expect(paths).toContain(p);
    expect(paths).toContain('/');
    expect(paths).toContain('/pricing');
    expect(paths).toContain('/teardown');
    expect(paths).toContain('/404');
  });

  it('prerenders a checkout page for every buyable tier, and only those', () => {
    const buyable = catalogue.services.flatMap((s) => s.tiers).filter((t) => t.buyable);
    for (const t of buyable) expect(paths).toContain(`/checkout/${t.id}`);
    const checkout = paths.filter((p) => p.startsWith('/checkout/'));
    expect(checkout).toHaveLength(buyable.length);
    expect(paths).not.toContain('/checkout/apps-growth');
    expect(paths).toContain('/thanks');
  });

  it('marks the styleguide, 404, thanks and every checkout page as noindex', () => {
    expect(NOINDEX_PATHS).toEqual(expect.arrayContaining(['/styleguide', '/404', '/thanks']));
    for (const p of paths.filter((x) => x.startsWith('/checkout/'))) expect(NOINDEX_PATHS).toContain(p);
    // Nothing else is hidden from the sitemap.
    expect(NOINDEX_PATHS).not.toContain('/teardown');
    expect(NOINDEX_PATHS.filter((p) => !p.startsWith('/checkout/')).sort()).toEqual(['/404', '/styleguide', '/thanks']);
  });
});
