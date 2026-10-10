/**
 * Dev-server helper: make `public/<dir>/index.html` resolve at `/<dir>/`,
 * the way Cloudflare Pages and `serve` do. Vite's dev server serves public/
 * files only by exact path, so without this `/homefind/` falls through to
 * the SPA and renders the site's 404 page. The build is unaffected.
 *
 * Not covered: `public/_redirects` rules (e.g. `/lab/play/plot-twist/*`)
 * apply only on Pages, not in `npm run dev`.
 *
 * Pure and Node-side: no Vite imports, so it is unit-testable.
 */

export type StaticIndexResolution =
  | { kind: 'redirect'; to: string }
  | { kind: 'rewrite'; to: string }
  | null;

/**
 * @param pathname URL pathname (no query string), e.g. `/lab/play/chai-break/`.
 * @param exists   Receives a URL-style path relative to `public/`
 *                 (e.g. `/homefind/index.html`) and says whether the file exists.
 */
export function resolveStaticIndex(
  pathname: string,
  exists: (publicPath: string) => boolean,
): StaticIndexResolution {
  if (!pathname.startsWith('/') || pathname === '/') return null;
  // Reject encoded characters outright (%2e, %2f, %5c, %00 ...): no static app
  // directory needs them, and it closes every traversal-by-encoding route.
  if (pathname.includes('%') || pathname.includes('\\') || pathname.includes('\0')) return null;

  const trailingSlash = pathname.endsWith('/');
  const segments = pathname.slice(1, trailingSlash ? -1 : undefined).split('/');
  // Empty segments (`//x`) would turn a redirect into a protocol-relative URL.
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null;
  // `/assets/x.js` is a file request, leave it to Vite. (A dotted directory
  // with a trailing slash is still a directory.)
  if (!trailingSlash && segments[segments.length - 1].includes('.')) return null;

  const dir = `/${segments.join('/')}`;
  if (!exists(`${dir}/index.html`)) return null;
  return trailingSlash
    ? { kind: 'rewrite', to: `${dir}/index.html` }
    : { kind: 'redirect', to: `${dir}/` };
}
