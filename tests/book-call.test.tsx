import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function renderButton(bookingUrl: string, page: string, compact = false) {
  vi.resetModules();
  vi.stubEnv('VITE_BOOKING_URL', bookingUrl);
  const { BookCallButton } = await import('../app/components/BookCallButton');
  return render(
    <MemoryRouter>
      <BookCallButton page={page} compact={compact} />
    </MemoryRouter>,
  );
}

let gtag: ReturnType<typeof vi.fn>;

beforeEach(() => {
  gtag = vi.fn();
  vi.stubGlobal('gtag', gtag);
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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('BookCallButton', () => {
  for (const compact of [false, true]) {
    describe(compact ? 'compact (header)' : 'button', () => {
      it('external booking URL: opens it in a new tab and records book_click { page }', async () => {
        await renderButton('https://cal.example.com/tp', '/services/websites/', compact);
        const link = screen.getByRole('link', { name: /Book a call/ });
        expect(link).toHaveAttribute('href', 'https://cal.example.com/tp');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveTextContent('(opens in a new tab)');
        link.click();
        expect(gtag).toHaveBeenCalledWith('event', 'book_click', { page: '/services/websites' });
      });

      it('unset: reads "Talk to us", links to /contact and records nothing', async () => {
        await renderButton('', '/work', compact);
        const link = screen.getByRole('link', { name: 'Talk to us' });
        expect(link).toHaveAttribute('href', '/contact');
        expect(link).not.toHaveAttribute('target');
        expect(screen.queryByText(/Book a call/)).toBeNull();
        link.click();
        expect(gtag).not.toHaveBeenCalled();
      });

      it('unset: renders nothing on /contact itself', async () => {
        const { container } = await renderButton('', '/contact/', compact);
        expect(container).toBeEmptyDOMElement();
      });
    });
  }

  it('external booking URL: still shows on /contact', async () => {
    await renderButton('https://cal.example.com/tp', '/contact');
    expect(screen.getByRole('link', { name: /Book a call/ })).toHaveAttribute('href', 'https://cal.example.com/tp');
  });
});
