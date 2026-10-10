import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { domAnimation, LazyMotion } from 'motion/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The test decides whether the Chatbot chunk loads (offline, or a deploy replaced its hash).
vi.mock('../app/components/chat/loadChatbot', () => ({ loadChatbot: vi.fn() }));
vi.mock('../app/lib/idle', () => ({ whenIdle: (fn: () => void) => (fn(), () => {}) }));
vi.mock('../app/lib/analytics', () => ({ track: () => {} }));
vi.mock('../app/lib/whatsapp', () => ({ WHATSAPP_NUMBER: '', waLink: () => '/contact' }));

import { loadChatbot } from '../app/components/chat/loadChatbot';
import { ChatLauncher } from '../app/components/ChatLauncher';

const loadMock = vi.mocked(loadChatbot);
const chunkError = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

// The real panel, for the retry that succeeds. Importing it here (generous timeout) also keeps the
// cold import out of the first test's time budget under parallel load.
let RealChatbot: Awaited<ReturnType<typeof loadChatbot>>;
beforeAll(async () => {
  RealChatbot = await vi.importActual<typeof RealChatbot>('../app/components/Chatbot');
}, 30_000);

/** The lazy chunk's (failed) import settles on a later tick; allow for a loaded machine. */
const SLOW = { timeout: 10_000 };

beforeEach(() => {
  loadMock.mockReset();
  loadMock.mockImplementation(chunkError);
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
  localStorage.clear();
});

function mount() {
  render(
    <MemoryRouter>
      <LazyMotion features={domAnimation} strict>
        <ChatLauncher />
      </LazyMotion>
    </MemoryRouter>,
  );
  return screen.getByRole('button', { name: 'Chat with Tech Pravaha' });
}

describe('ChatLauncher when the Chatbot chunk fails', () => {
  it('shows the fallback panel, not an error, and the launcher keeps working', async () => {
    const launcher = mount();

    fireEvent.click(launcher);
    const dialog = await screen.findByRole('dialog', { name: 'Tech Pravaha assistant' }, SLOW);
    expect(dialog).toHaveTextContent('The chat could not load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('button', { name: 'Close chat' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), SLOW);
    expect(launcher).toHaveFocus();
    expect(launcher).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(launcher);
    expect(await screen.findByRole('dialog', {}, SLOW)).toBeInTheDocument();
    // An Escape that only ends an IME composition, or that something else handled, leaves it open.
    fireEvent.keyDown(document.body, { key: 'Escape', isComposing: true });
    const handled = (e: Event) => e.preventDefault();
    document.addEventListener('keydown', handled, { capture: true });
    try {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    } finally {
      document.removeEventListener('keydown', handled, { capture: true });
    }
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), SLOW);
  }, 30_000);

  it('"Try again" loads the chunk again and, once it loads, shows the real panel', async () => {
    const launcher = mount();
    fireEvent.click(launcher);
    await screen.findByRole('button', { name: 'Try again' }, SLOW);
    expect(loadMock).toHaveBeenCalledTimes(1);

    // Still failing: the fallback comes back, and the loader really ran again (no cached lazy result).
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(2), SLOW);
    await screen.findByRole('button', { name: 'Try again' }, SLOW);

    // The network is back.
    loadMock.mockImplementation(() => Promise.resolve(RealChatbot));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const input = await screen.findByRole('textbox', { name: 'Message' }, SLOW);
    expect(loadMock).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('The chat could not load.', { exact: false })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Tech Pravaha assistant' })).toContainElement(input);
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
  }, 30_000);

  it('a failed hover/focus prefetch is swallowed (no unhandled rejection)', async () => {
    const launcher = mount();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      fireEvent.pointerEnter(launcher);
      fireEvent.focus(launcher);
      await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(2));
      // Let the rejections settle before checking nothing escaped.
      await new Promise((r) => setTimeout(r, 50));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
