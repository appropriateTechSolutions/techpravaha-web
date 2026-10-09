import { Component } from 'react';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MetallicHero } from '../app/components/MetallicHero';

const rasterFor = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ url: 'data:image/png;base64,AAAA', width: 900, height: 260, padding: 18 })),
);

vi.mock('../app/lib/metallic', () => ({
  METALLIC_MIN_WIDTH: 768,
  canRunMetallic: () => true,
  rasterFor,
}));

// The shader chunk fails to load (offline, a stale deploy): the dynamic import rejects.
vi.mock('../app/components/MetallicPaint', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

/** Stands in for the route's error boundary. */
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <p>Error page</p> : this.props.children;
  }
}

describe('MetallicHero when the shader chunk fails to load', () => {
  it('keeps the chrome H1 and never reaches the error boundary', async () => {
    const { container } = render(
      <Boundary>
        <MetallicHero lines={['Beautiful things,', 'shipped.']}>
          Beautiful things,
          <br />
          shipped.
        </MetallicHero>
      </Boundary>,
    );

    await waitFor(() => expect(rasterFor).toHaveBeenCalled());
    // The overlay mounts, its import rejects, the stand-in reports onError and the overlay goes.
    await waitFor(() => expect(container.querySelector('[aria-hidden="true"]')).toBeNull(), { timeout: 3000 });

    expect(screen.queryByText('Error page')).not.toBeInTheDocument();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Beautiful things,shipped.');
    expect(h1).not.toHaveClass('text-transparent');
    expect(h1).not.toHaveClass('bg-none');
  });
});
