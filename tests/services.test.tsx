import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useRouteError } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServicePage from '../app/routes/services.$slug';
import ServicesIndex from '../app/routes/services';
import Pricing from '../app/routes/pricing';
import { ErrorBoundary as RootErrorBoundary } from '../app/root';
import { catalogue, formatINR, getService } from '../app/lib/catalogue';
import { SERVICES } from '../app/content/services';

// jsdom has neither IntersectionObserver (Reveal, Steps) nor matchMedia (reduced-motion checks).
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The app's real root error boundary, fed by the data router. */
function Boundary() {
  const error = useRouteError();
  const Root = RootErrorBoundary as unknown as (p: { error: unknown }) => React.ReactNode;
  return <Root error={error} />;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/services', Component: ServicesIndex },
      { path: '/services/:slug', Component: ServicePage, ErrorBoundary: Boundary },
      { path: '/pricing', Component: Pricing },
      { path: '*', Component: () => null },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('service page', () => {
  it('renders the H1 from content and the three tier cards for /services/websites', () => {
    renderAt('/services/websites');
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(SERVICES.websites.h1);

    const service = getService('websites')!;
    expect(service.tiers).toHaveLength(3);
    for (const tier of service.tiers) {
      expect(screen.getByRole('heading', { level: 3, name: tier.label })).toBeInTheDocument();
      expect(document.getElementById(tier.id)).not.toBeNull();
    }
    expect(screen.getAllByText(formatINR(service.tiers[0].price!)).length).toBeGreaterThan(0);
  });

  it('shows a breadcrumb back to the services index', () => {
    renderAt('/services/websites');
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services');
  });

  it('emits Service and BreadcrumbList JSON-LD', () => {
    const { container } = renderAt('/services/websites');
    const types = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? '{}')['@type'],
    );
    expect(types).toEqual(expect.arrayContaining(['Service', 'BreadcrumbList', 'FAQPage']));
  });

  it('hides related work when the service has none', () => {
    expect(SERVICES.content.related).toEqual([]);
    renderAt('/services/content');
    expect(screen.queryByRole('heading', { level: 2, name: /related work/i })).toBeNull();
  });

  it('shows related work when the service has some', () => {
    renderAt('/services/websites');
    expect(screen.getByRole('heading', { level: 2, name: /related work/i })).toBeInTheDocument();
  });

  it('renders the 404 boundary for an unknown slug', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/services/nope');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'That page did not ship.' })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('services index', () => {
  it('links to all six services', () => {
    renderAt('/services');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    for (const s of catalogue.services) expect(hrefs).toContain(s.route);
  });
});

describe('pricing', () => {
  it('renders one anchored block per service with its tiers and an in-page nav', () => {
    const { container } = renderAt('/pricing');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: /services on this page/i });
    for (const s of catalogue.services) {
      expect(container.querySelector(`#${s.id}`)).not.toBeNull();
      expect(within(nav).getByRole('link', { name: s.name })).toHaveAttribute('href', `#${s.id}`);
      for (const t of s.tiers) expect(document.getElementById(t.id)).not.toBeNull();
    }
    expect(screen.getByText(catalogue.addons[0].name, { selector: 'h3' })).toBeInTheDocument();
  });
});
