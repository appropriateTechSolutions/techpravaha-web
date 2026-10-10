import { anthropicMessages } from './anthropic';
import { TEXT_CONTROL_RE } from './chars';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import { buildSystemPrompt, factAmounts, rupeeAmounts, trailingAmounts } from './prompt';
import { allow, clientIp } from './ratelimit';
import { globalFetch, safeErrorText, UPSTREAM_TIMEOUT_MS } from './upstream';

/** Blocked, empty or unusable answers (200). */
export const CHAT_FALLBACK = 'I cannot answer that one. Message us on WhatsApp or use /contact and a human will reply.';
/** The model is down, slow or not configured (502). */
export const CHAT_OUTAGE = 'I cannot answer right now. Message us on WhatsApp or use /contact and a human will reply.';
/** A reply that quotes a rupee amount not in the FACTS (200): a computed or invented price never reaches a visitor. */
export const PRICE_ONLY_REPLY =
  'I can only quote the prices on our pricing page. See /pricing for exact amounts, or message us on WhatsApp.';
/** Over the per-IP limit (429). The binding window is 60 s (wrangler.toml [[ratelimits]] CHAT_RATE). */
export const QUOTA_REPLY = 'You have sent a lot of messages in a short time. Wait a minute or message us on WhatsApp instead.';
/** Body over MAX_BODY_BYTES (413). */
export const TOO_LONG_REPLY = 'That conversation is too long for me. Start a new chat or message us on WhatsApp.';

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 2000;
// 20 messages x 2,000 chars is 40,000 chars: room for that as JSON, with some multi-byte text.
const MAX_BODY_BYTES = 64 * 1024;
export const DEFAULT_CHAT_MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 600;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatInputError';
  }
}

/** Checks the request shape; the error text is safe to return to the client. */
export function validateChat(body: unknown): { ok: true; messages: ChatMessage[] } | { ok: false; error: string } {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages must be an array of 1 to ${MAX_MESSAGES}` };
  }
  const out: ChatMessage[] = [];
  for (const m of messages as unknown[]) {
    const { role, content } = (m ?? {}) as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return { ok: false, error: 'invalid role' };
    if (typeof content !== 'string' || content.trim() === '') return { ok: false, error: 'invalid content' };
    if (content.length > MAX_CHARS) return { ok: false, error: `message over ${MAX_CHARS} characters` };
    if (TEXT_CONTROL_RE.test(content)) return { ok: false, error: 'invalid characters' };
    out.push({ role, content });
  }
  if (out[0]!.role !== 'user') return { ok: false, error: 'first message must be from the user' };
  if (out[out.length - 1]!.role !== 'user') return { ok: false, error: 'last message must be from the user' };
  return { ok: true, messages: out };
}

/**
 * Request params for the chat route. claude-haiku-5-5 thinks by default (thinking tokens count against
 * max_tokens) and 400s on a non-default temperature, top_p or top_k, so no sampling params are sent and
 * thinking is off at effort low (disabled is accepted at effort high or below).
 */
export const CHAT_PARAMS = {
  max_tokens: MAX_TOKENS,
  thinking: { type: 'disabled' },
  output_config: { effort: 'low' },
} as const;

/**
 * One Anthropic Messages call. Throws ChatInputError for a bad body and UpstreamError (or a fetch/timeout
 * error) when the model cannot answer; a refusal or an empty answer is CHAT_FALLBACK, not an error.
 */
export async function chat(
  env: Pick<Env, 'ANTHROPIC_API_KEY' | 'CHAT_MODEL'>,
  body: { messages: ChatMessage[] },
  fetchImpl: typeof fetch = globalFetch,
): Promise<{ reply: string }> {
  const v = validateChat(body);
  if (!v.ok) throw new ChatInputError(v.error);

  const { stopReason, text: raw } = await anthropicMessages(
    env,
    {
      model: env.CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL,
      ...CHAT_PARAMS,
      // One text block so the (static) prompt can be cached across turns.
      system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: v.messages.map((m) => ({ role: m.role, content: m.content })),
    },
    UPSTREAM_TIMEOUT_MS,
    fetchImpl,
  );

  // A refusal is withheld whole; any partial text is dropped (Haiku has no server-side fallback).
  if (stopReason === 'refusal') return { reply: CHAT_FALLBACK };
  let text = raw.trim();
  if (stopReason === 'max_tokens') text = trimToSentence(text);
  if (!text) return { reply: CHAT_FALLBACK };
  // The prompt forbids new numbers; this enforces it. Every amount must appear in the FACTS as written.
  const known = factAmounts();
  if ([...rupeeAmounts(text), ...trailingAmounts(text)].some((a) => !known.has(a))) return { reply: PRICE_ONLY_REPLY };
  return { reply: text };
}

/**
 * A reply cut off by max_tokens, trimmed back to its last full sentence. A cut that lands in a
 * rupee amount ("₹1,12,") gives '' (the caller then uses CHAT_FALLBACK): a truncated price must never
 * reach the visitor, even inside a sentence we would otherwise keep.
 */
export function trimToSentence(text: string): string {
  if (/₹[\d,]*$/.test(text)) return '';
  let end = -1;
  for (const m of text.matchAll(/[.!?]["')]?(?=\s|$)/g)) end = m.index + m[0].length;
  return end > 0 ? text.slice(0, end).trim() : '';
}

/**
 * POST /chat: body cap, JSON, shape check, per-IP quota (only valid requests spend it), then Anthropic.
 * Logs carry turn count, character counts and status only, never message or reply text or the IP.
 */
export async function handleChat(req: Request, env: Env, fetchImpl: typeof fetch = globalFetch): Promise<Response> {
  const read = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!read.ok) return json({ error: 'body too large', reply: TOO_LONG_REPLY }, 413, req, env);

  let body: unknown;
  try {
    body = JSON.parse(read.text);
  } catch {
    return json({ error: 'invalid json' }, 400, req, env);
  }
  const v = validateChat(body);
  if (!v.ok) return json({ error: v.error }, 400, req, env);

  const turns = v.messages.length;
  const inChars = v.messages.reduce((n, m) => n + m.content.length, 0);

  const quota = await allow(env.CHAT_RATE, clientIp(req));
  if (!quota.ok) {
    console.warn('chat', { status: 429, turns, inChars });
    return json({ error: 'too many messages', reply: QUOTA_REPLY }, 429, req, env);
  }

  try {
    const { reply } = await chat(env, { messages: v.messages }, fetchImpl);
    console.log('chat', { status: 200, turns, inChars, outChars: reply.length });
    return json({ reply }, 200, req, env);
  } catch (err) {
    console.error('chat', { status: 502, turns, inChars, why: safeErrorText(err) });
    return json({ error: 'assistant unavailable', reply: CHAT_OUTAGE }, 502, req, env);
  }
}
