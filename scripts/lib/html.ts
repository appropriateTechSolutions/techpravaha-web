/** Matches any `<link ... rel="modulepreload" ...>` tag, whatever the attribute order. */
const PRELOAD_RE = /<link\b[^>]*rel="modulepreload"[^>]*>/g;

/** Removes every modulepreload link from an HTML string. */
export function stripPreloads(html: string): string {
  return html.replace(PRELOAD_RE, '');
}

/** True when the HTML still contains a modulepreload link. */
export function hasPreloads(html: string): boolean {
  return /<link\b[^>]*rel="modulepreload"/.test(html);
}

/** Directories (relative to the build root, posix) that hold files we do not own: hashed assets and the static lab apps. */
export const PRELOAD_SKIP_DIRS = ['assets', 'lab/play'];
