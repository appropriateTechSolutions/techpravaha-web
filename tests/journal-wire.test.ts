// @vitest-environment node
/**
 * Wire shape of the real SDK call, with no network: a real Anthropic client whose `fetch` records
 * the request and answers with an error status. No API key is used.
 */
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { generateDraft } from '../scripts/journal/generate';
import type { Topic } from '../scripts/journal/topics';

const topic: Topic = { slug: 'a-slug', title: 'A title', angle: 'An angle.', status: 'queued' };

function probe(status: number, type: string) {
  const seen: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const client = new Anthropic({
    apiKey: 'dummy-not-a-key',
    maxRetries: 0,
    fetch: (async (url: string, init: RequestInit) => {
      seen.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ type: 'error', error: { type, message: 'probe' } }), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch,
  });
  return { client, seen };
}

describe('journal generate: real SDK request on the wire', () => {
  it('sends the fallback beta header, fallbacks "default", structured output and streaming', async () => {
    const { client, seen } = probe(529, 'overloaded_error');
    await expect(generateDraft(topic, { client })).rejects.toThrow(/^journal: Anthropic API error 529/);
    expect(seen).toHaveLength(1);
    const { url, headers, body } = seen[0]!;
    expect(url).toMatch(/\/v1\/messages\?beta=true$/);
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(body.fallbacks).toBe('default');
    expect(body.stream).toBe(true);
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.max_tokens).toBe(16000);
    const oc = body.output_config as { effort: string; format: { type: string } };
    expect(oc.effort).toBe('medium');
    expect(oc.format.type).toBe('json_schema');
    expect(body).not.toHaveProperty('thinking');
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('betas');
  });

  it('maps a 401 to the AuthenticationError message', async () => {
    const { client } = probe(401, 'authentication_error');
    await expect(generateDraft(topic, { client })).rejects.toThrow(
      'journal: Anthropic API rejected the credentials (set ANTHROPIC_API_KEY)',
    );
  });

  it('maps a 429 to the RateLimitError message', async () => {
    const { client } = probe(429, 'rate_limit_error');
    await expect(generateDraft(topic, { client })).rejects.toThrow('journal: Anthropic API rate limit hit, retry later');
  });
});
