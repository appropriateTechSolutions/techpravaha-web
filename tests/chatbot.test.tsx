import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { domAnimation, LazyMotion } from 'motion/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Controllable hydration + idle: the launcher waits for both.
let hydrated = true;
let idleCallbacks: (() => void)[] = [];
let runIdleNow = true;

vi.mock('../app/lib/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app/lib/motion')>()),
  useHydrated: () => hydrated,
}));
vi.mock('../app/lib/idle', () => ({
  whenIdle: (fn: () => void) => {
    if (runIdleNow) fn();
    else idleCallbacks.push(fn);
    return () => {};
  },
}));

const track = vi.fn();
vi.mock('../app/lib/analytics', () => ({ track: (...args: unknown[]) => track(...args) }));

// WhatsApp unset: every human path is /contact, and no wa.me link is ours.
vi.mock('../app/lib/whatsapp', () => ({ WHATSAPP_NUMBER: '', waLink: () => '/contact' }));

const sendChat = vi.fn();
vi.mock('../app/lib/chat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app/lib/chat')>()),
  sendChat: (...args: unknown[]) => sendChat(...args),
}));

import { ApiError } from '../app/lib/api';
import { CHAT_KEY, linkify, transcriptToSend } from '../app/lib/chat';
import { ChatLauncher } from '../app/components/ChatLauncher';

const LAUNCHER = 'Chat with Tech Pravaha';

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LazyMotion features={domAnimation} strict>
        <ChatLauncher />
      </LazyMotion>
    </MemoryRouter>,
  );
}

const launcher = () => screen.queryByRole('button', { name: LAUNCHER });

// The launcher lazy-loads the Chatbot chunk. Import it once here, with a generous timeout, so the first
// test does not pay for the cold import under parallel load; openChat still allows for a slow tick.
beforeAll(async () => {
  await import('../app/components/Chatbot');
}, 30_000);

async function openChat() {
  mount();
  fireEvent.click(launcher()!);
  return screen.findByRole('dialog', { name: 'Tech Pravaha assistant' }, { timeout: 10_000 });
}

function type(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: text } });
}

function send(text: string) {
  type(text);
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
  hydrated = true;
  runIdleNow = true;
  idleCallbacks = [];
  localStorage.clear();
  sessionStorage.clear();
  track.mockReset();
  sendChat.mockReset();
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
  vi.restoreAllMocks();
});

describe('ChatLauncher', () => {
  it('renders only after hydration and an idle callback', () => {
    hydrated = false;
    runIdleNow = false;
    const { rerender } = mount();
    expect(launcher()).toBeNull();

    hydrated = true;
    rerender(
      <MemoryRouter>
        <LazyMotion features={domAnimation} strict>
          <ChatLauncher />
        </LazyMotion>
      </MemoryRouter>,
    );
    expect(launcher()).toBeNull();
    expect(idleCallbacks).toHaveLength(1);

    act(() => idleCallbacks[0]!());
    const button = launcher()!;
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // Never auto-opens.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is absent on checkout and thanks pages', () => {
    const { unmount } = mount('/checkout/websites-launch/');
    expect(launcher()).toBeNull();
    unmount();
    mount('/thanks');
    expect(launcher()).toBeNull();
  });

  it('opens the dialog on click and tracks chat_open once per session', async () => {
    const dialog = await openChat();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
    expect(launcher()).toHaveAttribute('aria-controls', dialog.id);
    expect(track).toHaveBeenCalledWith('chat_open');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(launcher()!);
    await screen.findByRole('dialog');
    expect(track.mock.calls.filter(([n]) => n === 'chat_open')).toHaveLength(1);
  });

  it('shows the quick replies on an empty transcript; "Talk to a human" is a link', async () => {
    await openChat();
    expect(screen.getByRole('button', { name: 'What does a landing page cost?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How fast can you ship an app?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Talk to a human/ })).toHaveAttribute('href', '/contact');
  });

  it('posts the transcript and renders the reply', async () => {
    sendChat.mockResolvedValue({ reply: 'A landing page starts at the Launch tier.', status: 200 });
    await openChat();
    send('What does a landing page cost?');

    expect(sendChat).toHaveBeenCalledTimes(1);
    expect(sendChat.mock.calls[0]![0]).toEqual([{ role: 'user', content: 'What does a landing page cost?' }]);
    expect(track).toHaveBeenCalledWith('chat_send');

    const log = screen.getByRole('log');
    expect(await within(log).findByText('A landing page starts at the Launch tier.')).toBeInTheDocument();
    expect(within(log).getByText('What does a landing page cost?')).toBeInTheDocument();
    // Clarity masks the conversation in session recordings (the privacy page says so).
    expect(log.closest('[data-clarity-mask="True"]')).not.toBeNull();
    // Quick replies are only for an empty transcript.
    expect(screen.queryByRole('button', { name: 'How fast can you ship an app?' })).toBeNull();
    // Persisted.
    expect(JSON.parse(localStorage.getItem(CHAT_KEY)!)).toHaveLength(2);
  });

  it('sends on Enter, keeps Shift+Enter for a newline', async () => {
    sendChat.mockResolvedValue({ reply: 'ok', status: 200 });
    await openChat();
    const box = screen.getByRole('textbox', { name: 'Message' });
    type('hello');
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(sendChat).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sendChat).toHaveBeenCalledTimes(1);
  });

  it('renders a 429 reply as an assistant message with a human path, no typing indicator', async () => {
    const quota = 'You have sent a lot of messages in a short time. Wait a minute or message us on WhatsApp instead.';
    sendChat.mockResolvedValue({ reply: quota, status: 429 });
    await openChat();
    send('hi');
    const log = screen.getByRole('log');
    expect(await within(log).findByText(quota)).toBeInTheDocument();
    expect(within(log).queryByText(/typing/)).toBeNull();
    expect(within(log).getByRole('link', { name: /WhatsApp|Contact us/ })).toBeInTheDocument();
  });

  it('shows a generic message for a 400 and an outage message when the network fails', async () => {
    sendChat.mockRejectedValueOnce(new ApiError(400));
    sendChat.mockRejectedValueOnce(new ApiError(0));
    await openChat();
    send('first');
    expect(await screen.findByText('Something went wrong. Try a shorter message.')).toBeInTheDocument();
    send('second');
    expect(await screen.findByText(/I cannot answer right now/)).toBeInTheDocument();
    // Neither notice is sent back to the model as an assistant turn.
    sendChat.mockResolvedValueOnce({ reply: 'ok', status: 200 });
    send('third');
    expect(sendChat.mock.calls[2]![0]).toEqual([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
      { role: 'user', content: 'third' },
    ]);
  });

  it('renders model text literally, never as HTML', async () => {
    sendChat.mockResolvedValue({ reply: 'Try <b>x</b> <img src=x onerror=alert(1)>', status: 200 });
    await openChat();
    send('hi');
    const log = screen.getByRole('log');
    expect(await within(log).findByText('Try <b>x</b> <img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(log.querySelector('b')).toBeNull();
    expect(log.querySelector('img')).toBeNull();
  });

  it('turns /pricing in a reply into a link to /pricing', async () => {
    sendChat.mockResolvedValue({ reply: 'See /pricing for every tier.', status: 200 });
    await openChat();
    send('prices?');
    const link = await within(screen.getByRole('log')).findByRole('link', { name: '/pricing' });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('sends at most the last 12 turns, starting with a user turn', async () => {
    const seeded = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));
    localStorage.setItem(CHAT_KEY, JSON.stringify(seeded));
    sendChat.mockResolvedValue({ reply: 'ok', status: 200 });
    await openChat();
    send('latest');
    const sent = sendChat.mock.calls[0]![0] as { role: string; content: string }[];
    expect(sent.length).toBeLessThanOrEqual(12);
    expect(sent[0]).toEqual({ role: 'user', content: 'm2' });
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'latest' });
    expect(sent.map((m) => m.content)).not.toContain('m0');
    await screen.findByText('ok');
    expect(JSON.parse(localStorage.getItem(CHAT_KEY)!)).toHaveLength(12);
  });

  it('caps input at 1,500 characters', async () => {
    await openChat();
    type('a'.repeat(1600));
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toHaveLength(1500);
    expect(screen.getByText('1,500 / 1,500')).toBeInTheDocument();
  });

  it('Clear chat empties the transcript and storage', async () => {
    localStorage.setItem(CHAT_KEY, JSON.stringify([{ role: 'user', content: 'old' }, { role: 'assistant', content: 'reply' }]));
    await openChat();
    expect(screen.getByText('old')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear chat' }));
    expect(screen.queryByText('old')).toBeNull();
    expect(localStorage.getItem(CHAT_KEY)).toBeNull();
  });

  it('still works when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    sendChat.mockResolvedValue({ reply: 'fine', status: 200 });
    await openChat();
    send('hi');
    expect(await screen.findByText('fine')).toBeInTheDocument();
  });

  it('Escape closes the dialog and returns focus to the launcher', async () => {
    const dialog = await openChat();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(launcher()).toHaveFocus();
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape anywhere on the page closes the open panel', async () => {
    await openChat();
    // State first: wait for the open state, then close from the document with no timers involved.
    await waitFor(() => expect(launcher()).toHaveAttribute('aria-expanded', 'true'));
    document.body.focus();
    // The lazy chunk can paint the dialog a tick before its document listener is attached, so the key is
    // re-sent until the state flips; once closed the listener is gone and a repeat does nothing.
    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(launcher()).toHaveFocus();
  });

  it('ignores an Escape that only ends an IME composition or that something else already handled', async () => {
    await openChat();
    const input = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    const handled = (e: Event) => e.preventDefault();
    document.addEventListener('keydown', handled, { capture: true });
    try {
      fireEvent.keyDown(input, { key: 'Escape' });
    } finally {
      document.removeEventListener('keydown', handled, { capture: true });
    }
    // State, not the DOM: the panel's exit animation would keep a closing dialog in the DOM for a moment.
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('the /contact human link closes the sheet on a phone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 639px)',
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    await openChat();
    fireEvent.click(screen.getByRole('link', { name: 'Talk to a human' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(track).toHaveBeenCalledWith('book_click', { page: 'chat', via: 'contact' });
  });

  it('traps Tab inside the dialog', async () => {
    const dialog = await openChat();
    const focusables = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea');
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});

describe('transcriptToSend', () => {
  it('drops notices, keeps the last 12 and never starts with an assistant turn', () => {
    const msgs = [
      { role: 'user' as const, content: 'a' },
      { role: 'assistant' as const, content: 'busy', notice: true },
      ...Array.from({ length: 13 }, (_, i) => ({
        role: (i % 2 === 0 ? 'assistant' : 'user') as 'user' | 'assistant',
        content: `t${i}`,
      })),
    ];
    const out = transcriptToSend(msgs);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out[0]!.role).toBe('user');
    expect(out.every((m) => !('notice' in m))).toBe(true);
    expect(out.some((m) => m.content === 'busy')).toBe(false);
  });
});

describe('linkify', () => {
  const hrefs = (text: string) =>
    linkify(text, '')
      .filter((p) => typeof p !== 'string')
      .map((p) => (p as { href: string }).href);

  it('links site paths and the allowed hosts only', () => {
    expect(hrefs('See /pricing or /services/websites.')).toEqual(['/pricing', '/services/websites']);
    expect(hrefs('Visit https://techpravaha.com/contact today')).toEqual(['/contact']);
  });

  it('links wa.me only for our configured number', () => {
    const ours = (text: string) =>
      linkify(text, '919876543210')
        .filter((p) => typeof p !== 'string')
        .map((p) => (p as { href: string }).href);
    expect(ours('Ping https://wa.me/919876543210 now')).toEqual(['https://wa.me/919876543210']);
    expect(ours('Ping https://wa.me/911111111111 now')).toEqual([]);
    // Number unset: no wa.me link at all, and the digits are not re-read as a path.
    expect(hrefs('Ping https://wa.me/919876543210 now')).toEqual([]);
    expect(linkify('Ping https://wa.me/919876543210 now', '').join('')).toBe('Ping https://wa.me/919876543210 now');
  });

  it('never links protocol-relative, foreign or script URLs', () => {
    expect(hrefs('go //evil.com now')).toEqual([]);
    expect(hrefs('go https://evil.com/pricing now')).toEqual([]);
    expect(hrefs('javascript:alert(1)')).toEqual([]);
    expect(hrefs('and/or 24/7')).toEqual([]);
    expect(hrefs('https://techpravaha.com.evil.com/x')).toEqual([]);
  });
});
