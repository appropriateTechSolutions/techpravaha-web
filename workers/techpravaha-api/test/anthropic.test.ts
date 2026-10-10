import { describe, expect, it, vi } from 'vitest';
import { ANTHROPIC_URL, ANTHROPIC_VERSION, anthropicMessages } from '../src/anthropic';
import { UpstreamError } from '../src/upstream';

const env = { ANTHROPIC_API_KEY: 'sk-ant-helper-key' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('anthropicMessages()', () => {
  it('POSTs the body as given to the Messages API with the key and version headers and a timeout signal', async () => {
    const f = vi.fn(async (_u: RequestInfo | URL, _i?: RequestInit) =>
      json({ content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' }),
    );
    const body = { model: 'claude-haiku-5-5', max_tokens: 10, messages: [{ role: 'user', content: 'x' }] };
    await expect(anthropicMessages(env, body, 5000, f as unknown as typeof fetch)).resolves.toEqual({
      stopReason: 'end_turn',
      text: 'hi',
    });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe('https://api.anthropic.com/v1/messages');
    expect(ANTHROPIC_URL).toBe('https://api.anthropic.com/v1/messages');
    expect(init!.method).toBe('POST');
    const h = new Headers(init!.headers);
    expect(h.get('x-api-key')).toBe('sk-ant-helper-key');
    expect(h.get('anthropic-version')).toBe('2023-06-01');
    expect(ANTHROPIC_VERSION).toBe('2023-06-01');
    expect(h.get('content-type')).toBe('application/json');
    expect(JSON.parse(String(init!.body))).toEqual(body);
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it('joins text blocks by type and skips thinking and other blocks; text is not trimmed', async () => {
    const f = async () =>
      json({
        content: [
          { type: 'thinking', thinking: '', signature: 's' },
          { type: 'text', text: ' a' },
          { type: 'tool_use', id: 't', name: 'n', input: {} },
          { type: 'text', text: 'b ' },
        ],
        stop_reason: 'max_tokens',
      });
    await expect(anthropicMessages(env, {}, 5000, f as unknown as typeof fetch)).resolves.toEqual({
      stopReason: 'max_tokens',
      text: ' ab ',
    });
  });

  it('a body with no content gives empty text', async () => {
    for (const body of [{}, { content: null }, { content: 'nope' }, null]) {
      const f = async () => json(body);
      await expect(anthropicMessages(env, {}, 5000, f as unknown as typeof fetch)).resolves.toEqual({
        stopReason: undefined,
        text: '',
      });
    }
  });

  it('throws UpstreamError with our own wording on a missing key, a non-2xx status or invalid JSON', async () => {
    const f = vi.fn(async () => json({ content: [] }));
    await expect(anthropicMessages({}, {}, 5000, f as unknown as typeof fetch)).rejects.toThrow(
      new UpstreamError('anthropic not configured'),
    );
    expect(f).not.toHaveBeenCalled();

    const echo = async () => new Response('{"error":"echo sk-ant-helper-key"}', { status: 529 });
    const err = await anthropicMessages(env, {}, 5000, echo as unknown as typeof fetch).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as Error).message).toBe('anthropic responded 529');

    const bad = async () => new Response('not json', { status: 200 });
    await expect(anthropicMessages(env, {}, 5000, bad as unknown as typeof fetch)).rejects.toThrow(
      new UpstreamError('anthropic returned invalid json'),
    );
  });

  it('fetch and timeout errors propagate', async () => {
    const t = async () => {
      throw new DOMException('timed out', 'TimeoutError');
    };
    await expect(anthropicMessages(env, {}, 5000, t as unknown as typeof fetch)).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
