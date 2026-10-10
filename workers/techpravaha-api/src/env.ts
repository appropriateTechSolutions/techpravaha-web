export interface Env {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  SHEETS_WEBHOOK_URL: string;
  SHEETS_WEBHOOK_TOKEN: string;
  ALLOWED_ORIGINS: string;
  ALERT_EMAIL: string;
  FROM_EMAIL: string;
  /** Optional https kickoff booking link for the receipt email (e.g. a Google Calendar appointment page). */
  BOOKING_URL?: string;
  /** Optional WhatsApp number for the receipt email, digits with country code (e.g. 919876543210). */
  WHATSAPP_NUMBER?: string;
  /** Optional Anthropic model id for POST /chat; defaults to claude-haiku-5-5. */
  CHAT_MODEL?: string;
  /** Secret, optional. With TELEGRAM_CHAT_ID, order and lead pings go to Telegram instead of ALERT_EMAIL. */
  TELEGRAM_BOT_TOKEN?: string;
  /** Optional Telegram chat id for pings (a user id, or a group id such as -100...). */
  TELEGRAM_CHAT_ID?: string;
  ORDERS: KVNamespace;
  /** Workers Rate Limiting binding for POST /chat, keyed per IP (wrangler.toml [[ratelimits]]). */
  CHAT_RATE: RateLimit;
  /** Workers Rate Limiting binding for POST /leads, keyed per IP (6 per minute; wrangler.toml [[ratelimits]]). */
  LEADS_RATE: RateLimit;
  /**
   * Secret. Anthropic API key for POST /chat and POST /lab/complete. Unset, /chat answers 502 with the
   * outage reply and /lab/complete answers 503 so the lab apps show their offline state.
   */
  ANTHROPIC_API_KEY?: string;
  /** Optional Anthropic model id for the lab apps; defaults to claude-haiku-5-5. */
  LAB_MODEL?: string;
  /** Workers Rate Limiting binding for POST /lab/complete, keyed per IP (30 per minute; wrangler.toml [[ratelimits]]). */
  LAB_RATE: RateLimit;
}
