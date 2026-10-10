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
      expect.objectContaining({ tier: 'websites-launch', page: '/contact' }),
    );
  });

  it('ignores a malformed ?order=', () => {
    renderAt('/contact?order=%3Cb%3Ehi');
    expect((screen.getByLabelText(/^message/i) as HTMLTextAreaElement).value).toBe('');
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
});

describe('submitLead', () => {
  const lead = {
    name: 'Asha',
    email: 'asha@example.com',
    message: 'Hello',
    page: '/contact',
    type: 'contact' as const,
  };

  it('resolves ok:false without a network call while the script URL is unset or a placeholder', async () => {
    const { submitLead: real } = await vi.importActual<typeof import('../app/services/leads')>(
      '../app/services/leads',
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    vi.stubEnv('VITE_LEADS_SCRIPT_URL', '');
    expect(await real(lead)).toEqual({ ok: false });
    vi.stubEnv('VITE_LEADS_SCRIPT_URL', 'https://script.google.com/macros/s/REPLACE/exec');
    expect(await real(lead)).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the lead as JSON in no-cors mode when the URL is set', async () => {
    const { submitLead: real } = await vi.importActual<typeof import('../app/services/leads')>(
      '../app/services/leads',
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_LEADS_SCRIPT_URL', 'https://script.google.com/macros/s/abc123/exec');

    expect(await real(lead)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://script.google.com/macros/s/abc123/exec');
    expect(init).toMatchObject({ method: 'POST', mode: 'no-cors' });
    expect(JSON.parse(init.body)).toEqual(lead);

    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await real(lead)).toEqual({ ok: false });
  });
});
