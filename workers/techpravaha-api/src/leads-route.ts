import { alertSafely } from './webhook';
import type { Env } from './env';
import { json, readBodyCapped } from './http';
import { ping } from './ping';
import { allow, clientIp } from './ratelimit';
import { appendLeadRow } from './sheets';
import { safeErrorText } from './upstream';
import { validateLeadBody, type LeadBody } from './validate';

const MAX_BODY_BYTES = 16 * 1024;

/** Sheet row, then the founder ping. Each runs regardless of the other; neither can throw. */
async function afterLead(env: Env, l: LeadBody): Promise<void> {
  try {
    await appendLeadRow(env, l);
  } catch (err) {
    const why = safeErrorText(err);
    console.error('lead sheet append failed', l.type, why);
    // No customer data here: the Telegram ping below carries the lead's name, email, page and any site URL.
    await alertSafely(
      env,
      'Lead sheet append failed',
      `The Leads Sheet append failed for a new ${l.type} (${why}). This lead is not stored anywhere else. The Telegram lead ping, if Telegram is configured, carries the name, email, page and any site URL; the message and phone are lost, so ask the visitor again.`,
    );
  }
  const url = l.type === 'lead_magnet' && l.url ? ` · ${l.url}` : '';
  await ping(env, 'lead', `New ${l.type}: ${l.name} ${l.email} · ${l.page}${l.tier ? ` · ${l.tier}` : ''}${url}`);
}

/**
 * POST /leads: body cap, JSON, validation, per-IP quota (only valid requests spend it), then a
 * 202 straight away; the Sheet row and the ping run in waitUntil. Logs carry the lead type and
 * status only, never a name, email, message or the IP.
 */
export async function handleLead(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const read = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!read.ok) return json({ error: 'body too large' }, 413, req, env);

  let body: unknown;
  try {
    body = JSON.parse(read.text);
  } catch {
    return json({ error: 'invalid json' }, 400, req, env);
  }

  const v = validateLeadBody(body);
  if (!v.ok) {
    return json(v.fields.length ? { error: v.error, fields: v.fields } : { error: v.error }, 400, req, env);
  }

  const quota = await allow(env.LEADS_RATE, clientIp(req));
  if (!quota.ok) {
    console.warn('lead', { status: 429 });
    return json({ error: 'too many requests' }, 429, req, env);
  }

  console.log('lead', { status: 202, type: v.value.type });
  ctx.waitUntil(afterLead(env, v.value));
  return json({ ok: true }, 202, req, env);
}
