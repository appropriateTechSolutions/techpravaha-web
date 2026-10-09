import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MetallicPaintProps } from '../app/components/MetallicPaint';
import { MetallicHero } from '../app/components/MetallicHero';

// The shader may run, the raster resolves, and MetallicPaint is a stub that hands
// its callbacks to the test, so the class swap can be driven without WebGL.
const paint = vi.hoisted(() => ({ props: null as MetallicPaintProps | null }));

vi.mock('../app/lib/metallic', () => ({
  METALLIC_MIN_WIDTH: 768,
  canRunMetallic: () => true,
  rasterFor: () =>
    Promise.resolve({ url: 'data:image/png;base64,AAAA', width: 900, height: 260, padding: 18 }),
}));

vi.mock('../app/components/MetallicPaint', () => ({
  default: (props: MetallicPaintProps) => {
    paint.props = props;
    return <div data-testid="paint" />;
  },
}));

afterEach(() => {
  paint.props = null;
});

function renderHero() {
  render(
    <MetallicHero lines={['Beautiful things,', 'shipped.']}>
      Beautiful things,
      <br />
      shipped.
    </MetallicHero>,
  );
  return screen.getByRole('heading', { level: 1 });
}

describe('MetallicHero class swap', () => {
  it('hides the H1 paint only after onReady, and restores it on onError', async () => {
    const h1 = renderHero();
    await screen.findByTestId('paint');

    // Mounted but not drawn yet: the chrome text stays visible.
    expect(h1).not.toHaveClass('text-transparent');
    expect(paint.props?.imageSrc).toBe('data:image/png;base64,AAAA');

    act(() => paint.props?.onReady?.());
    expect(h1).toHaveClass('text-transparent');
    expect(h1).toHaveClass('bg-none');

    act(() => paint.props?.onError?.());
    await waitFor(() => expect(screen.queryByTestId('paint')).not.toBeInTheDocument());
    expect(h1).not.toHaveClass('text-transparent');
    expect(h1).not.toHaveClass('bg-none');
    expect(h1).toHaveTextContent('Beautiful things,shipped.');
  });
});
