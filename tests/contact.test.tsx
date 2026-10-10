import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The form's network call is mocked; the real module is exercised separately below.
vi.mock('../app/services/leads', () => ({ submitLead: vi.fn() }));

// A configured WhatsApp number, so the fallback renders a wa.me link.
vi.mock('../app/lib/whatsapp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/lib/whatsapp')>();
  return {
    ...actual,
    WHATSAPP_NUMBER: '919800000000',
    waLink: (message: string) => `https://wa.me/919800000000?text=${encodeURIComponent(message)}`,
  };
});

import { submitLead } from '../app/services/leads';
import ContactPage from '../app/routes/contact';

const submitLeadMock = vi.mocked(submitLead);

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
  vi.unstubAllEnvs();
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/contact', Component: ContactPage },
      { path: '*', Component: () => null },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
}

describe('contact form', () => {
  it('shows a validation message for an empty email and does not submit', () => {
    renderAt('/contact');
    fill(/^name/i, 'Asha');
    fill(/^message/i, 'A site for my bakery.');
    submit();

    expect(screen.getByText('Add your email.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it('moves focus to the first invalid field, already marked invalid', () => {
    renderAt('/contact');
    fill(/^name/i, 'Asha');
    // Record the field's state at the moment focus lands, which is what a screen reader announces.
    let atFocus: string | null = null;
    const onFocus = (e: FocusEvent) => {
      atFocus = (e.target as HTMLElement).getAttribute('aria-invalid');
    };
    document.addEventListener('focusin', onFocus);
    submit();
    document.removeEventListener('focusin', onFocus);

    const focused = document.activeElement as HTMLElement;
    expect(focused).toBe(screen.getByLabelText(/^email/i));
    expect(atFocus).toBe('true');
    expect(focused).toHaveAccessibleDescription('Add your email.');
  });

  it('keeps a status live region mounted before anything is sent', () => {
    renderAt('/contact');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('prefills the message and the WhatsApp link from ?tier=', () => {
    renderAt('/contact?tier=websites-launch');
    const message = screen.getByLabelText(/^message/i) as HTMLTextAreaElement;
    expect(message.value).toContain('Websites & landing pages · Launch');

    const wa = screen.getAllByRole('link', { name: /whatsapp/i })[0];
    expect(wa.getAttribute('href')).toContain(
      encodeURIComponent("Hi Tech Pravaha, I'd like a quote for Websites & landing pages · Launch."),
    );
  });

  it('prefills the order line from ?order= and keeps the tier alongside', async () => {
    submitLeadMock.mockResolvedValue({ ok: true });
    renderAt('/contact/?order=order_TEST1234567890&tier=websites-launch');
    const message = screen.getByLabelText(/^message/i) as HTMLTextAreaElement;
    expect(message.value).toBe('Order order_TEST1234567890: here are my details and references.');
    // The page's WhatsApp button speaks for a paid order, not a quote request.
    const wa = screen.getAllByRole('link', { name: /whatsapp/i })[0];
    expect(wa.getAttribute('href')).toContain(
      encodeURIComponent('Hi Tech Pravaha, order order_TEST1234567890: here are my details and references.'),
    );

    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    submit();
    await screen.findByText('Thanks. We reply within one working day.');
    // Trailing slash from Cloudflare Pages is normalised away.
    expect(submitLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'contact',
        order: 'order_TEST1234567890',
        tier: 'websites-launch',
        page: '/contact',
      }),
    );
  });

  it('ignores a malformed ?order=', () => {
    renderAt('/contact?order=%3Cb%3Ehi');
    expect((screen.getByLabelText(/^message/i) as HTMLTextAreaElement).value).toBe('');
  });

  it.each([
    ['a one-character name', { name: 'A', email: 'a@example.com', message: 'Hi' }, 'Add your name.'],
    ['a name over 80 characters', { name: 'x'.repeat(81), email: 'a@example.com', message: 'Hi' }, 'Keep the name under 80 characters.'],
    ["an apostrophe email the Worker refuses", { name: 'Asha', email: "o'brien@example.com", message: 'Hi' }, 'That email does not look right.'],
    ['a hidden character in the message', { name: 'Asha', email: 'a@example.com', message: 'Hi\u202ethere' }, 'That message does not look right. It has a hidden character, probably from a paste. Retype it.'],
    ['letters in the phone', { name: 'Asha', email: 'a@example.com', message: 'Hi', phone: '98765 x3210' }, 'That phone number does not look right.'],
  ])('refuses %s before sending', (_label, values, error) => {
    renderAt('/contact');
    for (const [k, v] of Object.entries(values)) fill(new RegExp(`^${k}`, 'i'), v);
    submit();
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it('caps the inputs at the Worker limits and counts the message from 1,800 characters', () => {
    renderAt('/contact');
    expect(screen.getByLabelText(/^name/i)).toHaveAttribute('maxlength', '80');
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('maxlength', '254');
    expect(screen.getByLabelText(/^message/i)).toHaveAttribute('maxlength', '2000');
    expect(screen.queryByText(/\/ 2,000/)).toBeNull();
    fill(/^message/i, 'x'.repeat(1800));
    expect(screen.getByText('1,800 / 2,000')).toBeInTheDocument();
  });

  it('accepts a foreign phone number and a message with line breaks', async () => {
    submitLeadMock.mockResolvedValue({ ok: true });
    renderAt('/contact');
    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    fill(/^phone/i, '+44 20 7946 0958');
    fill(/^message/i, 'Line one\nLine two');
    submit();
    await screen.findByText('Thanks. We reply within one working day.');
    expect(submitLeadMock).toHaveBeenCalledWith(expect.objectContaining({ phone: '+44 20 7946 0958' }));
  });

  it('shows the thank-you state when the lead is sent', async () => {
    submitLeadMock.mockResolvedValue({ ok: true });
    renderAt('/contact?tier=websites-launch');
    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    submit();

    expect(await screen.findByText('Thanks. We reply within one working day.')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Thanks. We reply within one working day.');
    expect(document.activeElement).toBe(status);
    expect(submitLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Asha',
        email: 'asha@example.com',
        tier: 'websites-launch',
        page: '/contact',
        type: 'contact',
      }),
    );
    // No ?order= means no order field at all.
    expect(submitLeadMock.mock.calls[0]![0]).not.toHaveProperty('order');
  });

  it('offers WhatsApp when the lead fails to send', async () => {
    submitLeadMock.mockResolvedValue({ ok: false });
    renderAt('/contact');
    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    fill(/^message/i, 'A site for my bakery.');
    submit();

    expect(await screen.findByText(/Message didn't send\./)).toBeInTheDocument();
    const fallback = screen.getByRole('link', { name: /WhatsApp us instead/ });
    expect(fallback.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919800000000\?text=/);
  });

  it('falls back, never stuck on sending, even if submitLead throws', async () => {
    submitLeadMock.mockRejectedValue(new Error('boom'));
    renderAt('/contact');
    fill(/^name/i, 'Asha');
    fill(/^email/i, 'asha@example.com');
    fill(/^message/i, 'A site for my bakery.');
    submit();

    expect(await screen.findByText(/Message didn't send\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp us instead/ })).toBeInTheDocument();
  });
});
