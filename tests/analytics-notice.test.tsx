import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadAnalytics = vi.fn();
vi.mock('../app/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app/lib/analytics')>()),
  loadAnalytics: () => loadAnalytics(),
}));

import { AnalyticsNotice, NOTICE_KEY } from '../app/components/AnalyticsNotice';

const notice = () => screen.queryByRole('region', { name: 'Analytics notice' });

function mount() {
  return render(
    <MemoryRouter>
      <AnalyticsNotice />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  loadAnalytics.mockReset();
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
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('AnalyticsNotice', () => {
  it('renders the one-line notice with a privacy link and an OK button when unseen', () => {
    vi.stubEnv('VITE_GA_ID', 'G-ABC123DEF4');
    vi.stubEnv('VITE_CLARITY_ID', 'abcd1234ef');
    mount();
    expect(notice()).toHaveTextContent(
      'We use Google Analytics and Microsoft Clarity to see how the site is used.',
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('names only the tools whose ids are real, and neither while both are placeholders', () => {
    vi.stubEnv('VITE_GA_ID', 'G-ABC123DEF4');
    vi.stubEnv('VITE_CLARITY_ID', 'xxxxxxxxxx');
    const first = mount();
    expect(notice()).toHaveTextContent(/^We use Google Analytics to see how the site is used\./);
    first.unmount();

    vi.stubEnv('VITE_GA_ID', 'G-XXXXXXXXXX');
    vi.stubEnv('VITE_CLARITY_ID', '');
    mount();
    expect(notice()).toHaveTextContent(/^We use analytics to see how the site is used\./);
    expect(notice()).not.toHaveTextContent(/Google|Clarity/);
  });

  it('sets scroll-padding-bottom on <html> from --tp-notice-h while visible, and clears it on OK', () => {
    const html = document.documentElement.style;
    mount();
    expect(html.getPropertyValue('scroll-padding-bottom')).toBe('var(--tp-notice-h)');
    expect(html.getPropertyValue('--tp-notice-h')).toMatch(/^\d+px$/);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(html.getPropertyValue('scroll-padding-bottom')).toBe('');
    expect(html.getPropertyValue('--tp-notice-h')).toBe('');
  });

  it('hides and persists tp-notice=1 on OK', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(notice()).toBeNull();
    expect(localStorage.getItem(NOTICE_KEY)).toBe('1');
  });

  it('does not render when tp-notice is already set', () => {
    localStorage.setItem(NOTICE_KEY, '1');
    mount();
    expect(notice()).toBeNull();
  });

  it('still renders, and OK still hides it, when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mount();
    expect(notice()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(notice()).toBeNull();
  });

  it('loads analytics once, on idle, only after the notice is in the DOM', async () => {
    let noticeWasRendered = false;
    loadAnalytics.mockImplementation(() => {
      noticeWasRendered = notice() !== null;
    });
    mount();
    expect(loadAnalytics).not.toHaveBeenCalled();
    await waitFor(() => expect(loadAnalytics).toHaveBeenCalledTimes(1));
    expect(noticeWasRendered).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await new Promise((r) => setTimeout(r, 10));
    expect(loadAnalytics).toHaveBeenCalledTimes(1);
  });

  it('still loads analytics for a returning visitor who already saw it', async () => {
    localStorage.setItem(NOTICE_KEY, '1');
    mount();
    await waitFor(() => expect(loadAnalytics).toHaveBeenCalledTimes(1));
  });
});
