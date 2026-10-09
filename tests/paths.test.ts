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
    expect(paths).toContain('/404');
  });

  it('marks the styleguide and 404 as noindex', () => {
    expect(NOINDEX_PATHS).toEqual(['/styleguide', '/404']);
  });
});
