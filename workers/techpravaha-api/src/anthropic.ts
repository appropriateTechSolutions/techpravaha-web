/** The one Anthropic Messages call shared by POST /chat and POST /lab/complete. Each route sends its own params. */
import type { Env } from './env';
import { globalFetch, UpstreamError } from './upstream';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicResponse {
  stop_reason?: string;
  content?: { type?: string; text?: string }[];
}

/**
 * POSTs `body` to the Messages API and returns the stop reason and the text blocks joined (thinking and
 * other block types are skipped; read by type, not position). Throws UpstreamError when the key is unset,
 * on a non-2xx status or on a body that is not JSON; fetch and timeout errors propagate as thrown.
 * The upstream body never reaches logs or the client: it can echo the request.
 */
export async function anthropicMessages(
  env: Pick<Env, 'ANTHROPIC_API_KEY'>,
  body: Record<string, unknown>,
  timeoutMs: number,
  fetchImpl: typeof fetch = globalFetch,
): Promise<{ stopReason: string | undefined; text: string }> {
  if (!env.ANTHROPIC_API_KEY) throw new UpstreamError('anthropic not configured');
  const res = await fetchImpl(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new UpstreamError(`anthropic responded ${res.status}`);
  }
  let data: AnthropicResponse;
  try {
    data = (await res.json()) as AnthropicResponse;
  } catch {
    throw new UpstreamError('anthropic returned invalid json');
  }
  const text = (Array.isArray(data?.content) ? data.content : [])
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  return { stopReason: data?.stop_reason, text };
}
