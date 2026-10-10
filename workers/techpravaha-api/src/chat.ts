import { TEXT_CONTROL_RE } from './chars';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import { buildSystemPrompt, factAmounts, rupeeAmounts, trailingAmounts } from './prompt';
import { allow, clientIp } from './ratelimit';
import { globalFetch, safeErrorText, UPSTREAM_TIMEOUT_MS, UpstreamError } from './upstream';

/** Blocked, empty or unusable answers (200). */
export const CHAT_FALLBACK = 'I cannot answer that one. Message us on WhatsApp or use /contact and a human will reply.';
/** Gemini down, slow or not configured (502). */
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
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_OUTPUT_TOKENS = 600;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Finish reasons that mean the answer was withheld; any partial text is dropped.
const BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY', 'LANGUAGE', 'OTHER']);
const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' }));

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
  if (out[out.length - 1]!.role !== 'user') return { ok: false, error: 'last message must be from the user' };
  return { ok: true, messages: out };
}

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

/**
 * generationConfig for a model id. On 2.5 models thinking tokens count against maxOutputTokens and
 * can leave no answer, so the budget is 0. 3.x models default to minimal thinking, so no thinking
 * config is sent; if a future id needs `thinking_level`, add it here.
 */
export function generationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.4 };
  if (model.startsWith('gemini-2.5')) config.thinkingConfig = { thinkingBudget: 0 };
  return config;
}

/**
 * One Gemini generateContent call. Throws ChatInputError for a bad body and UpstreamError (or a
 * fetch/timeout error) when Gemini cannot answer; a blocked or empty answer is CHAT_FALLBACK, not an error.
 */
export async function chat(
  env: Pick<Env, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>,
  body: { messages: ChatMessage[] },
  fetchImpl: typeof fetch = globalFetch,
): Promise<{ reply: string }> {
  const v = validateChat(body);
  if (!v.ok) throw new ChatInputError(v.error);
  if (!env.GEMINI_API_KEY) throw new UpstreamError('gemini not configured');

  const model = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const res = await fetchImpl(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    // Header rather than ?key=: URLs end up in logs and runtime error messages.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: v.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: generationConfig(model),
      safetySettings: SAFETY_SETTINGS,
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    // The body can echo the request; it never reaches logs or the client.
    await res.body?.cancel().catch(() => {});
    throw new UpstreamError(`gemini responded ${res.status}`);
  }
  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    throw new UpstreamError('gemini returned invalid json');
  }

  if (data.promptFeedback?.blockReason) return { reply: CHAT_FALLBACK };
  const candidate = data.candidates?.[0];
  if (!candidate || (candidate.finishReason && BLOCKED.has(candidate.finishReason))) return { reply: CHAT_FALLBACK };
  let text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();
  if (candidate.finishReason === 'MAX_TOKENS') text = trimToSentence(text);
  if (!text) return { reply: CHAT_FALLBACK };
  // The prompt forbids new numbers; this enforces it. Every amount must appear in the FACTS as written.
  const known = factAmounts();
  if ([...rupeeAmounts(text), ...trailingAmounts(text)].some((a) => !known.has(a))) return { reply: PRICE_ONLY_REPLY };
  return { reply: text };
}

/**
 * A reply cut off by maxOutputTokens, trimmed back to its last full sentence. A cut that lands in a
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
 * POST /chat: body cap, JSON, shape check, per-IP quota (only valid requests spend it), then Gemini.
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
