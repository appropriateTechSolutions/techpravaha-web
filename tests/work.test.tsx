import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useRouteError } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkIndex from '../app/routes/work';
import WorkPage from '../app/routes/work.$slug';
import LabPage from '../app/routes/lab';
import { ErrorBoundary as RootErrorBoundary } from '../app/root';
import { WORK } from '../app/content/work';
import { LAB } from '../app/content/lab';

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

function Boundary() {
  const error = useRouteError();
  const Root = RootErrorBoundary as unknown as (p: { error: unknown }) => React.ReactNode;
  return <Root error={error} />;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/work', Component: WorkIndex },
      { path: '/work/:slug', Component: WorkPage, ErrorBoundary: Boundary },
      { path: '/lab', Component: LabPage },
      { path: '/services/:slug', Component: () => null },
      { path: '*', Component: () => null },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('work index', () => {
  it('renders the h1 and one card per work item, with service names not ids', () => {
    renderAt('/work');
    expect(screen.getByRole('heading', { level: 1, name: 'Work' })).toBeInTheDocument();
    for (const w of WORK) {
      expect(screen.getByRole('heading', { level: 3, name: w.name })).toBeInTheDocument();
    }
    expect(screen.queryByText(/^apps$/)).toBeNull();
    expect(screen.getAllByText(/In progress$/)).toHaveLength(WORK.filter((w) => w.status === 'in-progress').length);
    expect(screen.getAllByText(/Apps/).length).toBeGreaterThan(0);
  });
});

describe('work detail', () => {
  it('renders the h1, breadcrumb and BreadcrumbList for /work/exhibition-app', () => {
    const { container } = renderAt('/work/exhibition-app');
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Exhibition App');
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work');
    const types = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? '{}')['@type'],
    );
    expect(types).toContain('BreadcrumbList');
  });

  it('renders lazy images with alt text and related service links', () => {
    renderAt('/work/exhibition-app');
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(WORK[0].images.length);
    for (const img of imgs) {
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img.getAttribute('alt')).toMatch(/^Exhibition App screen \d+$/);
    }
    expect(screen.getByRole('link', { name: 'Apps' })).toHaveAttribute('href', '/services/apps');
  });

  it('shows the work status, not the track name', () => {
    renderAt('/work/intpro');
    expect(screen.getByText('Studio product · In progress')).toBeInTheDocument();
    expect(screen.queryByText(/Launched/)).toBeNull();
  });

  it('shows Live on a shipped project', () => {
    renderAt('/work/exhibition-app');
    expect(screen.getByText(/· Live$/)).toBeInTheDocument();
  });

  it('renders the 404 boundary for an unknown slug', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/work/nope');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'That page did not ship.' })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('lab', () => {
  it('renders one card per LAB entry', () => {
    renderAt('/lab');
    expect(screen.getByRole('heading', { level: 1, name: 'Lab' })).toBeInTheDocument();
    for (const item of LAB) {
      expect(screen.getByRole('heading', { level: 3, name: item.name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(LAB.length);
  });

  it('filters by kind with aria-pressed buttons', () => {
    renderAt('/lab');
    const all = screen.getByRole('button', { name: 'All' });
    const play = screen.getByRole('button', { name: 'Play' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(play).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(play);
    expect(play).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    const plays = LAB.filter((l) => l.kind === 'play');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(plays.length);
    for (const l of LAB.filter((l) => l.kind !== 'play')) {
      expect(screen.queryByRole('heading', { level: 3, name: l.name })).toBeNull();
    }
  });
});
