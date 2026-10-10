import { sendAlert } from './email';
import type { Env } from './env';
import { globalFetch, safeErrorText, UpstreamError } from './upstream';

// Telegram rejects messages over 4,096 characters.
const MAX_TEXT = 4000;
// A ping is a courtesy; it should not hold afterPaid open for the full upstream timeout.
const TELEGRAM_TIMEOUT_MS = 5_000;

type PingEnv = Pick<Env, 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID' | 'RESEND_API_KEY' | 'FROM_EMAIL' | 'ALERT_EMAIL'>;

/**
 * Tell Yogesh about a new order or lead: Telegram sendMessage when TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID are both set. Without Telegram, an order ping is an email to ALERT_EMAIL with
 * subject "New order", and a lead ping is skipped: /leads is anonymous, so a lead must never spend
 * the Resend quota that receipts depend on (the Leads tab is the record). Never throws; a failure is logged with the kind and an alert-safe reason only (the bot token
 * sits in the Telegram URL and the text can carry a customer name).
 */
export async function ping(
  env: PingEnv,
  kind: 'order' | 'lead',
  text: string,
  fetchImpl: typeof fetch = globalFetch,
): Promise<void> {
  try {
    const token = env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = env.TELEGRAM_CHAT_ID?.trim();
    if (token && chatId) {
      const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(0, MAX_TEXT), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      });
      await res.body?.cancel().catch(() => {});
      if (!res.ok) throw new UpstreamError(`telegram responded ${res.status}`);
      return;
    }
    if (kind === 'lead') {
      console.info('lead ping skipped: Telegram not configured');
      return;
    }
    await sendAlert(env, `New ${kind}`, text, fetchImpl);
  } catch (err) {
    console.error('ping failed', kind, safeErrorText(err));
  }
}
