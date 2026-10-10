import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { domAnimation, LazyMotion } from 'motion/react';
import type { Route } from './+types/root';

import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/geist';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './theme.css';

// Latin subsets of the two fonts above the fold; preloaded so the headline does not re-paint when they swap in.
// (fontsource does not export its files/ directory, hence the relative path.)
import bricolageLatinUrl from '../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2?url';
import geistLatinUrl from '../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';

import { JsonLd } from './components/ui/JsonLd';
import { organizationSchema } from './lib/schema';
import { AnalyticsNotice } from './components/AnalyticsNotice';
import { ChatLauncher } from './components/ChatLauncher';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { useTheme } from './components/ThemeToggle';

export const links: Route.LinksFunction = () => [
  { rel: 'preload', as: 'font', type: 'font/woff2', href: bricolageLatinUrl, crossOrigin: 'anonymous' },
  { rel: 'preload', as: 'font', type: 'font/woff2', href: geistLatinUrl, crossOrigin: 'anonymous' },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicons/favicon-32.png' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicons/favicon-16.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/apple-touch-icon.png' },
  { rel: 'manifest', href: '/favicons/site.webmanifest' },
  // Journal feed; the file is written at build time from app/content/journal.
  { rel: 'alternate', type: 'application/rss+xml', title: 'Tech Pravaha Journal', href: '/rss.xml' },
];

// Runs in <head> before paint: dark is default, light when stored or preferred on first visit.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');var l=t==='light'||(!t&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',l);}catch(e){}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  const { isLight, toggle } = useTheme();

  return (
    // The inline script adds `light` to <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <Meta />
        <Links />
        <JsonLd data={organizationSchema()} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {/* One motion feature bundle for the whole app; `strict` forbids full `motion.*` components. */}
        <LazyMotion features={domAnimation} strict>
          <SiteHeader isLight={isLight} onToggleTheme={toggle} />
          <main id="main">{children}</main>
          <SiteFooter />
          {/* Loads GA4 + Clarity on idle after the notice renders; never inside Reveal. */}
          <AnalyticsNotice />
          {/* After hydration + idle; the panel is a lazy chunk loaded on first use. */}
          <ChatLauncher />
        </LazyMotion>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/** Status of a thrown error. `throw data(...)` during render reaches the boundary unconverted. */
function errorStatus(error: unknown): number | undefined {
  if (isRouteErrorResponse(error)) return error.status;
  if (typeof error === 'object' && error !== null && 'init' in error) {
    return (error as { init?: ResponseInit | null }).init?.status;
  }
  return undefined;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = errorStatus(error) === 404;
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6 pt-32 pb-20">
      <div className="max-w-md text-center">
        <p className="label-mono is-accent mb-4">{notFound ? '404' : 'Error'}</p>
        <h1 className="display-3 mb-4">{notFound ? 'That page did not ship.' : 'Something broke.'}</h1>
        <p className="mb-8 text-ink-2">
          {notFound
            ? 'It may have moved, or the link is wrong. The home page still works.'
            : 'An unexpected error stopped this page. The home page still works.'}
        </p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </section>
  );
}
