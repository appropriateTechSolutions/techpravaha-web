import type { MetaDescriptor } from 'react-router';

export const SITE_URL = 'https://techpravaha.com';
export const SITE_NAME = 'Tech Pravaha';
export const TAGLINE = 'Beautiful things, shipped.';
export const ATS_URL = 'https://appropriatetechsolutions.com';
export const CONTACT_EMAIL = 'hello@techpravaha.com';
export const BOOKING_URL: string = import.meta.env.VITE_BOOKING_URL || '/contact';
/** True when VITE_BOOKING_URL is a real external booking page (Calendly, Google Calendar). */
export const HAS_BOOKING: boolean = /^https?:\/\//.test(BOOKING_URL);

/** Router pathname without a trailing slash (Cloudflare serves `/x/`), root stays `/`. */
export function pagePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
}

export const DEFAULT_OG_IMAGE = '/og/default.png';

/**
 * Absolute URL for a site path, in the form Cloudflare Pages serves with a 200:
 * `/` stays `/`, every other path ends with `/` (Pages 308-redirects `/x` to `/x/`
 * because the build writes `x/index.html`). A `#fragment` is kept after the slash.
 */
export function siteUrl(path: string): string {
  const [pathname, hash] = path.split('#');
  const trimmed = pathname.replace(/\/+$/, '');
  const withSlash = `${trimmed}/`;
  return `${SITE_URL}${withSlash}${hash !== undefined ? `#${hash}` : ''}`;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  /** Path to a page-specific OG image, e.g. '/og/work-foo.png'. */
  image?: string;
  noindex?: boolean;
}

/**
 * One meta builder for every route: title, description, canonical,
 * Open Graph, and Twitter card. React Router meta() format.
 */
export function pageMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
}: PageMeta): MetaDescriptor[] {
  const url = siteUrl(path);
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
  const imageUrl = `${SITE_URL}${image}`;
  return [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:image', content: imageUrl },
    { property: 'og:site_name', content: SITE_NAME },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
  ];
}
