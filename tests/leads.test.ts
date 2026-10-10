import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitLead, type LeadData } from '../app/services/leads';

const lead: LeadData = {
  type: 'contact',
  name: 'Asha',
  email: 'asha@example.com',
  message: 'Hello',
  page: '/contact',
  order: 'order_TEST1234567890',
};

const reply = (status: number, body: unknown = { ok: true }) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('submitLead', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_API_URL', 'https://api.test/');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('POSTs the lead as JSON to the Worker /leads and resolves ok on 202', async () => {
    fetchMock.mockResolvedValue(reply(202));
    expect(await submitLead(lead)).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/leads');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(lead);
  });

  it('never calls anything but the Worker (no Apps Script URL on the site)', async () => {
    vi.stubEnv('VITE_LEADS_SCRIPT_URL', 'https://script.google.com/macros/s/abc/exec');
    fetchMock.mockResolvedValue(reply(202));
    await submitLead(lead);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['https://api.test/leads']);
  });

  it('resolves ok:false on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(await submitLead(lead)).toEqual({ ok: false });
  });

  it.each([500, 400, 429, 200])('resolves ok:false on a %i (only 202 is an accept)', async (status) => {
    fetchMock.mockResolvedValue(reply(status, { error: 'nope' }));
    expect(await submitLead(lead)).toEqual({ ok: false });
  });

  it('resolves ok:false when the Worker never answers (15 s timeout)', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const pending = submitLead(lead);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toEqual({ ok: false });
  });
});
