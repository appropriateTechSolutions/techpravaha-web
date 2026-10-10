import { HOSTED_APP_SLUGS } from './paths';

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

/**
 * Directories (relative to the build root, posix) that hold files we do not own: hashed assets,
 * the static lab apps and the hosted products (`public/<slug>/`, built in their own repos).
 */
export const PRELOAD_SKIP_DIRS: string[] = ['assets', 'lab/play', ...HOSTED_APP_SLUGS];
