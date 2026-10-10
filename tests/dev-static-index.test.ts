import { describe, expect, it } from 'vitest';
import { resolveStaticIndex } from '../scripts/lib/dev-static-index';

const files = new Set(['/homefind/index.html', '/lab/play/chai-break/index.html']);
const exists = (p: string) => files.has(p);

describe('resolveStaticIndex', () => {
  it('redirects a directory without trailing slash', () => {
    expect(resolveStaticIndex('/homefind', exists)).toEqual({ kind: 'redirect', to: '/homefind/' });
  });

  it('rewrites a directory with trailing slash to its index.html', () => {
    expect(resolveStaticIndex('/homefind/', exists)).toEqual({ kind: 'rewrite', to: '/homefind/index.html' });
    expect(resolveStaticIndex('/lab/play/chai-break/', exists)).toEqual({
      kind: 'rewrite',
      to: '/lab/play/chai-break/index.html',
    });
  });

  it('leaves app routes alone when no index.html exists', () => {
    expect(resolveStaticIndex('/services/websites/', exists)).toBeNull();
    expect(resolveStaticIndex('/services/websites', exists)).toBeNull();
    expect(resolveStaticIndex('/', exists)).toBeNull();
  });

  it('leaves file requests alone', () => {
    expect(resolveStaticIndex('/assets/x.js', exists)).toBeNull();
    expect(resolveStaticIndex('/homefind/index.html', exists)).toBeNull();
  });

  it('rejects traversal, encoded slashes and empty segments', () => {
    const all = () => true;
    for (const p of ['/../etc/passwd', '/%2e%2e/', '/a/..%2fb/', '/a%2Fb/', '/a\\b/', '//evil.com', '/a//b/']) {
      expect(resolveStaticIndex(p, all)).toBeNull();
    }
  });
});
