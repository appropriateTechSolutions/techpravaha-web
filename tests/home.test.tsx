import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../app/routes/home';
import { catalogue } from '../app/lib/catalogue';

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

describe('Home', () => {
  it('renders the tagline as the only H1', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toMatch(/Beautiful things,\s*shipped\./);
  });

  it('links to every catalogue service', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(catalogue.services).toHaveLength(6);
    for (const s of catalogue.services) {
      expect(hrefs).toContain(`/services/${s.id}`);
    }
  });

  it('points not-ready visitors to the free teardown under the closing CTA', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Not ready to buy\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /free 10-point teardown/i })).toHaveAttribute('href', '/teardown');
  });
});
