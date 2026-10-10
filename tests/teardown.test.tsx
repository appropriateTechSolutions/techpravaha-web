import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../app/services/leads', () => ({ submitLead: vi.fn() }));
vi.mock('../app/lib/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/lib/analytics')>();
  return { ...actual, track: vi.fn() };
});
vi.mock('../app/lib/whatsapp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/lib/whatsapp')>();
  return {
    ...actual,
    WHATSAPP_NUMBER: '919800000000',
    waLink: (message: string) => `https://wa.me/919800000000?text=${encodeURIComponent(message)}`,
  };
});

import { track } from '../app/lib/analytics';
import { TEARDOWN_POINTS } from '../app/content/teardown';
import { submitLead } from '../app/services/leads';
import Teardown, { meta } from '../app/routes/teardown';

const submitLeadMock = vi.mocked(submitLead);
const trackMock = vi.mocked(track);

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  submitLeadMock.mockReset();
  trackMock.mockReset();
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

afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  const router = createMemoryRouter([{ path: '/teardown', Component: Teardown }, { path: '*', Component: () => null }], {
    initialEntries: ['/teardown'],
  });
  return render(<RouterProvider router={router} />);
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillAll(url = 'https://example.com') {
  fill(/site url/i, url);
  fill(/^name/i, 'Asha');
  fill(/^email/i, 'asha@example.com');
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /get my teardown/i }));

describe('teardown page', () => {
  it('has ten content points, each a title and one or two sentences, no em-dashes', () => {
    expect(TEARDOWN_POINTS).toHaveLength(10);
    for (const p of TEARDOWN_POINTS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.body).not.toMatch(/\u2014/);
      expect(p.title).not.toMatch(/\u2014/);
      const sentences = p.body.split(/(?<=[.?!])\s+/).filter(Boolean);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
      expect(sentences.length).toBeLessThanOrEqual(2);
    }
  });

  it('renders the heading and the ten points as a numbered list', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'A 10-point teardown of your current site.' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: /ten checks/i });
    const items = Array.from(list.querySelectorAll(':scope > li'));
    expect(items).toHaveLength(10);
    for (const [i, p] of TEARDOWN_POINTS.entries()) {
      expect(items[i]).toHaveTextContent(p.title);
      expect(items[i]).toHaveTextContent(p.body);
    }
    expect(items[0]).toHaveTextContent('01');
    expect(items[9]).toHaveTextContent('10');
  });

  it('meta names India and free', () => {
    const tags = meta();
    const title = tags.find((t) => 'title' in t) as { title: string };
    const desc = tags.find((t) => 'name' in t && t.name === 'description') as { content: string };
    expect(title.title).toContain('Free 10-point site teardown');
    expect(desc.content).toMatch(/India/);
    expect(desc.content).toMatch(/free/i);
  });

  it('shows an error for an invalid url and does not submit', () => {
    renderPage();
    fillAll('not a url');
    submit();
    expect(screen.getByText(/does not look like a web address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/site url/i)).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(screen.getByLabelText(/site url/i));
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it('requires a url', () => {
    renderPage();
    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    submit();
    expect(screen.getByText('Add your site address.')).toBeInTheDocument();
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it('submits a lead_magnet with the url and message, shows success and tracks once', async () => {
    submitLeadMock.mockResolvedValue({ ok: true });
    renderPage();
    fillAll('https://example.com/shop');
    fill(/whatsapp/i, '+91 98765 43210');
    submit();
    await screen.findByText('Thanks. Your teardown will reach you within two working days.');
    expect(submitLeadMock).toHaveBeenCalledTimes(1);
    expect(submitLeadMock).toHaveBeenCalledWith({
      type: 'lead_magnet',
      name: 'Asha',
      email: 'asha@example.com',
      phone: '+91 98765 43210',
      message: 'Teardown request for https://example.com/shop',
      page: '/teardown',
      url: 'https://example.com/shop',
    });
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('lead_submit', { type: 'lead_magnet' });
  });

  it('adds https:// when the visitor leaves the scheme off', async () => {
    submitLeadMock.mockResolvedValue({ ok: true });
    renderPage();
    fillAll('example.com');
    submit();
    await screen.findByText(/Thanks\. Your teardown/);
    expect(submitLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com', message: 'Teardown request for https://example.com' }),
    );
  });

  it('on failure shows the WhatsApp fallback with the url, and does not track', async () => {
    submitLeadMock.mockResolvedValue({ ok: false });
    renderPage();
    fillAll('https://example.com');
    submit();
    const alert = await screen.findByRole('alert');
    const wa = alert.querySelector('a[href^="https://wa.me/"]') as HTMLAnchorElement;
    expect(wa.getAttribute('href')).toContain(
      encodeURIComponent("Hi Tech Pravaha, I'd like the free teardown for https://example.com"),
    );
    expect(trackMock).not.toHaveBeenCalled();
    // The visitor can retry.
    expect(screen.getByRole('button', { name: /get my teardown/i })).toBeEnabled();
  });

  it('falls back and lets the visitor retry even if submitLead throws', async () => {
    submitLeadMock.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    fillAll('https://example.com');
    submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(trackMock).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: /get my teardown/i });
    expect(button).toBeEnabled();
    // The in-flight guard was released: a retry reaches submitLead again.
    submitLeadMock.mockResolvedValueOnce({ ok: true });
    submit();
    await vi.waitFor(() => expect(submitLeadMock).toHaveBeenCalledTimes(2));
  });

  it('disables the button while sending, so a double submit makes one call', async () => {
    let resolve!: (v: { ok: boolean }) => void;
    submitLeadMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();
    fillAll();
    submit();
    const button = await screen.findByRole('button', { name: /sending/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.submit(screen.getByRole('form', { name: /teardown/i }));
    expect(submitLeadMock).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true }));
    await waitFor(() => expect(screen.getByText(/Thanks\. Your teardown/)).toBeInTheDocument());
    expect(submitLeadMock).toHaveBeenCalledTimes(1);
  });
});
