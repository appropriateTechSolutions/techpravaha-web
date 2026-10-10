/**
 * Client for the Worker's POST /chat (workers/techpravaha-api/src/chat.ts) and the small,
 * pure helpers the chat panel needs. Only the lazy Chatbot chunk imports this file.
 */
import { ApiError, request } from './api';
import { WHATSAPP_NUMBER } from './whatsapp';

export type ChatRole = 'user' | 'assistant';

/** One line of the transcript. `notice` marks a local or quota/outage reply: shown, never sent back. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  notice?: boolean;
}

/** localStorage key for the transcript. */
export const CHAT_KEY = 'tp-chat';
/** Turns kept in storage and sent per request (the Worker accepts 20). */
export const MAX_TURNS = 12;
/** Input cap per message (the Worker accepts 2,000). */
export const MAX_INPUT = 1500;
export const CHAT_TIMEOUT_MS = 15_000;

/** Same wording as the Worker's CHAT_OUTAGE, for when the Worker itself cannot be reached. */
export const OUTAGE_TEXT = 'I cannot answer right now. Message us on WhatsApp or use /contact and a human will reply.';
/** A 400: the Worker rejected the shape; the visitor can only shorten or rephrase. */
export const BAD_REQUEST_TEXT = 'Something went wrong. Try a shorter message.';

// Statuses whose JSON carries a visitor-facing `reply` (body too large, over quota, model down).
const REPLY_STATUSES = new Set([413, 429, 502]);

/**
 * What goes to the Worker: notices dropped, the last MAX_TURNS turns, and never a leading
 * assistant turn (the model expects the conversation to open with the visitor).
 */
export function transcriptToSend(messages: ChatMessage[]): { role: ChatRole; content: string }[] {
  const out = messages
    .filter((m) => !m.notice)
    .slice(-MAX_TURNS)
    .map(({ role, content }) => ({ role, content }));
  while (out.length > 0 && out[0]!.role === 'assistant') out.shift();
  return out;
}

/**
 * POST /chat. Resolves `{ reply, status }` for 200 and for 413/429/502 (their friendly `reply`);
 * throws ApiError for a 400, any other status, a missing reply, or no response (status 0).
 */
export async function sendChat(
  messages: { role: ChatRole; content: string }[],
  signal?: AbortSignal,
): Promise<{ reply: string; status: number }> {
  const { res, body } = await request(
    '/chat',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-MAX_TURNS) }),
      signal,
    },
    CHAT_TIMEOUT_MS,
  );
  const reply = (body as { reply?: unknown } | null)?.reply;
  if ((res.ok || REPLY_STATUSES.has(res.status)) && typeof reply === 'string' && reply.trim() !== '') {
    return { reply, status: res.status };
  }
  throw new ApiError(res.status);
}

/** Reads the stored transcript; anything malformed or unreadable is an empty chat. */
export function loadTranscript(): ChatMessage[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (m): m is ChatMessage =>
          typeof m === 'object' &&
          m !== null &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string',
      )
      .slice(-MAX_TURNS)
      .map((m) => (m.notice === true ? { role: m.role, content: m.content, notice: true } : { role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

/** Stores the last MAX_TURNS turns; an empty transcript removes the key. Storage errors are ignored. */
export function saveTranscript(messages: ChatMessage[]): void {
  try {
    if (messages.length === 0) localStorage.removeItem(CHAT_KEY);
    else localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_TURNS)));
  } catch {
    // storage blocked or full: the chat still works for this visit
  }
}

export interface LinkPart {
  text: string;
  href: string;
  external: boolean;
}

// A site path: lowercase segments, single slashes, never `//` (protocol-relative).
const PATH = String.raw`\/[a-z0-9]+(?:[\/-][a-z0-9]+)*\/?`;
const TOKEN = new RegExp(
  String.raw`(^|[\s("'])(https:\/\/(?:www\.)?techpravaha\.com(?:${PATH}|\/)?|https:\/\/wa\.me\/\d{6,15}(?:\?text=[A-Za-z0-9%+_~-]*)?|${PATH})`,
  'g',
);
// A token glued to more URL-ish text ("techpravaha.com.evil.com", "/pricing.html") stays plain text.
const GLUED = /^(?:\.[A-Za-z0-9]|[A-Za-z0-9_@:])/;

/**
 * Splits model text into plain strings and safe links. Only site paths (`/pricing`),
 * https://techpravaha.com URLs (as internal paths) and https://wa.me links to our own number
 * (`waNumber`, the configured WHATSAPP_NUMBER; none while it is unset) become links;
 * everything else, markup included, stays text for React to escape.
 */
export function linkify(text: string, waNumber: string = WHATSAPP_NUMBER): (string | LinkPart)[] {
  const parts: (string | LinkPart)[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const lead = match[1]!;
    const token = match[2]!;
    const start = match.index + lead.length;
    const end = start + token.length;
    if (GLUED.test(text.slice(end))) continue;

    let href: string;
    let external = false;
    if (token.startsWith('https://wa.me/')) {
      const digits = /^https:\/\/wa\.me\/(\d+)/.exec(token)![1];
      if (!waNumber || digits !== waNumber) continue;
      href = token;
      external = true;
    } else if (token.startsWith('https://')) {
      href = token.replace(/^https:\/\/(?:www\.)?techpravaha\.com/, '') || '/';
    } else {
      href = token;
    }
    if (start > last) parts.push(text.slice(last, start));
    parts.push({ text: token, href, external });
    last = end;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
