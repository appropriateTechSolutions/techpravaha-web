/**
 * One Claude call that turns a topic into a draft post plus three social captions.
 * Structured outputs (output_config.format) make the reply a JSON object; the shape is still
 * checked here so a bad reply fails loudly instead of reaching the lint or the disk.
 * Credentials come from the environment (ANTHROPIC_API_KEY or an `ant auth login` profile).
 */
import Anthropic from '@anthropic-ai/sdk';
import { LIMITS } from './limits';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import type { Topic } from './topics';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MAX_TOKENS = 16000;
/** Server-side refusal fallback, scalar "default" form; this header goes with that form only. */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface Captions {
  linkedin: string;
  x: string;
  whatsapp: string;
}

export interface Draft {
  title: string;
  summary: string;
  tags: string[];
  body: string;
  captions: Captions;
}

export const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    body_markdown: { type: 'string' },
    captions: {
      type: 'object',
      properties: {
        linkedin: { type: 'string' },
        x: { type: 'string' },
        whatsapp: { type: 'string' },
      },
      required: ['linkedin', 'x', 'whatsapp'],
      additionalProperties: false,
    },
  },
  required: ['title', 'summary', 'tags', 'body_markdown', 'captions'],
  additionalProperties: false,
} as const;

function fail(msg: string): never {
  throw new Error(`journal: ${msg}`);
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Validate the parsed model output and map it to a Draft. Throws `Error('journal: ...')`. */
export function toDraft(raw: unknown): Draft {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('model output is not a JSON object');
  const o = raw as Record<string, unknown>;
  for (const key of ['title', 'summary', 'body_markdown'] as const) {
    if (!nonEmpty(o[key])) fail(`model output has no ${key}`);
  }
  const tags = o.tags;
  if (!Array.isArray(tags) || !tags.every(nonEmpty)) fail('model output tags must be non-empty strings');
  if (tags.length < LIMITS.minTags || tags.length > LIMITS.maxTags) {
    fail(`model output has ${tags.length} tags, expected ${LIMITS.minTags} to ${LIMITS.maxTags}`);
  }
  const c = o.captions as Record<string, unknown> | null | undefined;
  if (!c || typeof c !== 'object') fail('model output has no captions');
  for (const key of ['linkedin', 'x', 'whatsapp'] as const) {
    const v = c[key];
    if (!nonEmpty(v)) fail(`model output has no ${key} caption`);
    if (v.length > LIMITS.captions[key]) fail(`${key} caption is ${v.length} characters, over ${LIMITS.captions[key]}`);
  }
  return {
    title: (o.title as string).trim(),
    summary: (o.summary as string).trim(),
    tags: (tags as string[]).map((t) => t.trim()),
    body: `${(o.body_markdown as string).trim()}\n`,
    captions: {
      linkedin: (c.linkedin as string).trim(),
      x: (c.x as string).trim(),
      whatsapp: (c.whatsapp as string).trim(),
    },
  };
}

export async function generateDraft(
  topic: Topic,
  opts: { client?: Anthropic; model?: string } = {},
): Promise<Draft> {
  const client = opts.client ?? new Anthropic();
  let message: Anthropic.Beta.BetaMessage;
  try {
    const stream = client.beta.messages.stream({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: DRAFT_SCHEMA },
      },
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(topic) }],
    });
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) fail('Anthropic API rejected the credentials (set ANTHROPIC_API_KEY)');
    if (err instanceof Anthropic.RateLimitError) fail('Anthropic API rate limit hit, retry later');
    if (err instanceof Anthropic.APIError) fail(`Anthropic API error${err.status ? ` ${err.status}` : ''}: ${err.message}`);
    throw err;
  }

  if (message.stop_reason === 'refusal') throw new Error('journal: model refused');
  if (message.stop_reason === 'max_tokens') fail(`model output hit max_tokens (${MAX_TOKENS})`);
  if (message.stop_reason !== 'end_turn') fail(`unexpected stop_reason "${String(message.stop_reason)}"`);

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail('model output is not valid JSON');
  }
  return toDraft(parsed);
}
