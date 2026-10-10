import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../app/lib/api';
import { CHAT_TIMEOUT_MS, sendChat } from '../app/lib/chat';

const MSGS = [{ role: 'user' as const, content: 'hi' }];

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A fetch that never answers until its signal aborts, like a stalled Worker. */
function hang() {
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sendChat', () => {
  it('posts { messages } to /chat and returns the reply on 200', async () => {
    const fetchMock = respond(200, { reply: 'Hello.' });
    await expect(sendChat(MSGS)).resolves.toEqual({ reply: 'Hello.', status: 200 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/chat$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ messages: MSGS });
  });

  it.each([413, 429, 502])('returns the friendly reply for %i instead of throwing', async (status) => {
    respond(status, { error: 'x', reply: `friendly ${status}` });
    await expect(sendChat(MSGS)).resolves.toEqual({ reply: `friendly ${status}`, status });
  });

  it('throws ApiError(400) for a 400', async () => {
    respond(400, { error: 'invalid content' });
    await expect(sendChat(MSGS)).rejects.toEqual(new ApiError(400));
    await expect(sendChat(MSGS)).rejects.toBeInstanceOf(ApiError);
  });

  it.each([
    ['missing', {}],
    ['empty', { reply: '   ' }],
    ['not a string', { reply: 42 }],
    ['no JSON', undefined],
  ])('throws on a 200 with a %s reply', async (_, body) => {
    respond(200, body);
    await expect(sendChat(MSGS)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws for a 502 without a reply (e.g. a gateway HTML page)', async () => {
    respond(502, undefined);
    await expect(sendChat(MSGS)).rejects.toMatchObject({ status: 502 });
  });

  it('rejects with ApiError(0) when the caller aborts', async () => {
    hang();
    const ctrl = new AbortController();
    const p = sendChat(MSGS, ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('rejects with ApiError(0) once 15 s pass without an answer, not before', async () => {
    vi.useFakeTimers();
    const fetchMock = hang();
    let settled = false;
    const p = sendChat(MSGS).finally(() => {
      settled = true;
    });
    p.catch(() => {});
    expect(CHAT_TIMEOUT_MS).toBe(15_000);
    await vi.advanceTimersByTimeAsync(CHAT_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('never sends more than 12 turns', async () => {
    const fetchMock = respond(200, { reply: 'ok' });
    const many = Array.from({ length: 15 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    await sendChat(many);
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.messages).toHaveLength(12);
    expect(sent.messages[0].content).toBe('m3');
  });
});
