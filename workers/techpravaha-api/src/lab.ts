import { anthropicMessages } from './anthropic';
import { TEXT_CONTROL_RE } from './chars';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import {
  buildUserMessage,
  LAB_APPS,
  LAB_TEMPERATURE,
  SPLIT_TONES,
  SYSTEM_PROMPTS,
  type LabApp,
  type LabOptions,
} from './lab-prompts';
import { allow, clientIp } from './ratelimit';
import { globalFetch, safeErrorText } from './upstream';

export const LAB_MAX_INPUT = 4000;
export const LAB_MAX_OPTIONS = 8;
export const LAB_MAX_OPTION_CHARS = 120;
/** Output cap per app: the translator's JSON (up to 6 pairs, 5 flags, 7 questions, a verdict) needs more room. */
export const LAB_MAX_TOKENS: Record<LabApp, number> = {
  'landlord-translator': 1200,
  'excuse-engine': 600,
  'split-the-awkward': 600,
};
export const LAB_TIMEOUT_MS = 15_000;
export const DEFAULT_LAB_MODEL = 'claude-haiku-5-5';
const MAX_BODY_BYTES = 16 * 1024;

export interface LabRequest {
  app: LabApp;
  input: string;
  options: LabOptions;
}

type Check = { ok: true } | { ok: false; error: string };
const fail = (error: string): Check => ({ ok: false, error });
const OK: Check = { ok: true };

/**
 * A short single-line option value: the free-text control rule (so ZWJ/ZWNJ for Indic names and emoji
 * pass) plus no line breaks or tabs, so a value cannot start a new line of the prompt.
 */
const isText = (v: unknown, max = LAB_MAX_OPTION_CHARS): v is string =>
  typeof v === 'string' && v.length <= max && !TEXT_CONTROL_RE.test(v) && !/[\t\n\r]/.test(v);

/** Per-app option shapes. Unknown keys are refused so the endpoint only does what the three apps need. */
function checkAppOptions(app: LabApp, o: LabOptions): Check {
  const keys = Object.keys(o);
  const only = (allowed: string[]) => keys.every((k) => allowed.includes(k));
  switch (app) {
    case 'landlord-translator':
      return keys.length === 0 ? OK : fail('this app takes no options');
    case 'excuse-engine':
      if (!only(['level'])) return fail('unknown option');
      return Number.isInteger(o.level) && (o.level as number) >= 1 && (o.level as number) <= 5
        ? OK
        : fail('level must be 1 to 5');
    case 'split-the-awkward': {
      if (!only(['from', 'to', 'amount', 'tone', 'upi'])) return fail('unknown option');
      if (!isText(o.from) || !o.from.trim() || !isText(o.to) || !o.to.trim()) return fail('from and to are required');
      if (typeof o.amount !== 'number' || !(o.amount > 0) || o.amount > 1e9) return fail('amount must be positive');
      if (typeof o.tone !== 'string' || !Object.hasOwn(SPLIT_TONES, o.tone)) return fail('unknown tone');
      if (o.upi !== undefined && !isText(o.upi)) return fail('invalid upi');
      return OK;
    }
  }
}

/** Checks the request shape; the error text is safe to return to the client. */
export function validateLab(body: unknown): { ok: true; req: LabRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid body' };
  const { app, input, options, ...rest } = body as Record<string, unknown>;
  if (Object.keys(rest).length) return { ok: false, error: 'unknown field' };
  if (typeof app !== 'string' || !(LAB_APPS as readonly string[]).includes(app)) return { ok: false, error: 'unknown app' };
  if (typeof input !== 'string' || input.trim() === '') return { ok: false, error: 'input is required' };
  if (input.length > LAB_MAX_INPUT) return { ok: false, error: `input over ${LAB_MAX_INPUT} characters` };
  if (TEXT_CONTROL_RE.test(input)) return { ok: false, error: 'invalid characters' };

  let opts: LabOptions = {};
  if (options !== undefined) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) return { ok: false, error: 'invalid options' };
    const entries = Object.entries(options as Record<string, unknown>);
    if (entries.length > LAB_MAX_OPTIONS) return { ok: false, error: `at most ${LAB_MAX_OPTIONS} options` };
    for (const [k, v] of entries) {
      const fine =
        typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || isText(v);
      if (!fine || k.length > 32) return { ok: false, error: 'invalid option value' };
    }
    opts = options as LabOptions;
  }
  const check = checkAppOptions(app as LabApp, opts);
  if (!check.ok) return check;
  return { ok: true, req: { app: app as LabApp, input, options: opts } };
}

/**
 * Claude 4.x models (claude-haiku-4-5, claude-sonnet-4-6, ...) take the per-app temperature and do not think
 * unless asked. Newer models such as claude-haiku-5-5 reject non-default sampling values with a 400 and think
 * by default (thinking tokens count against max_tokens), so they get thinking off and no sampling params.
 */
export function modelParams(model: string, app: LabApp): Record<string, unknown> {
  return /^claude-(haiku|sonnet|opus)-4/.test(model)
    ? { temperature: LAB_TEMPERATURE[app] }
    : { thinking: { type: 'disabled' } };
}

/**
 * One Anthropic Messages call. Throws UpstreamError (or a fetch/timeout error) when the model cannot
 * answer; a refusal, a truncated answer or one with no text is '' so the app shows its own empty or offline state.
 */
export async function complete(
  env: Pick<Env, 'ANTHROPIC_API_KEY' | 'LAB_MODEL'>,
  req: LabRequest,
  fetchImpl: typeof fetch = globalFetch,
): Promise<{ text: string }> {
  const model = env.LAB_MODEL?.trim() || DEFAULT_LAB_MODEL;
  const { stopReason, text } = await anthropicMessages(
    env,
    {
      model,
      max_tokens: LAB_MAX_TOKENS[req.app],
      ...modelParams(model, req.app),
      system: SYSTEM_PROMPTS[req.app],
      messages: [{ role: 'user', content: buildUserMessage(req.app, req.input, req.options) }],
    },
    LAB_TIMEOUT_MS,
    fetchImpl,
  );
  // A refusal has nothing to show, and an answer cut at max_tokens is truncated JSON or half a message:
  // '' sends each app to its own error or offline state.
  if (stopReason === 'refusal' || stopReason === 'max_tokens') return { text: '' };
  return { text: text.trim() };
}

/**
 * POST /lab/complete: body cap, JSON, shape check, key check, per-IP quota (only valid requests spend
 * it), then Anthropic. Logs carry the app, character counts and status only, never the input, the
 * options, the reply or the IP.
 */
export async function handleLab(req: Request, env: Env, fetchImpl: typeof fetch = globalFetch): Promise<Response> {
  const read = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!read.ok) return json({ error: 'body too large' }, 413, req, env);

  let body: unknown;
  try {
    body = JSON.parse(read.text);
  } catch {
    return json({ error: 'invalid json' }, 400, req, env);
  }
  const v = validateLab(body);
  if (!v.ok) return json({ error: v.error }, 400, req, env);

  const { app } = v.req;
  const inChars = v.req.input.length;

  if (!env.ANTHROPIC_API_KEY) {
    console.warn('lab', { app, status: 503, inChars });
    return json({ error: 'not configured' }, 503, req, env);
  }

  const quota = await allow(env.LAB_RATE, clientIp(req));
  if (!quota.ok) {
    console.warn('lab', { app, status: 429, inChars });
    return json({ error: 'too many requests' }, 429, req, env);
  }

  try {
    const { text } = await complete(env, v.req, fetchImpl);
    console.log('lab', { app, status: 200, inChars, outChars: text.length });
    return json({ text }, 200, req, env);
  } catch (err) {
    console.error('lab', { app, status: 502, inChars, why: safeErrorText(err) });
    return json({ error: 'unavailable' }, 502, req, env);
  }
}
