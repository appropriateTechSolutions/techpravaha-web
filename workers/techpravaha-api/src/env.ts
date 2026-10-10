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
  ORDERS: KVNamespace;
}
