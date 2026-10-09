import { formatINR } from './catalogue';

// Digits only. Empty, unset, or the `.env.example` placeholder (91XXXXXXXXXX) means "not configured".
const raw = String(import.meta.env.VITE_WHATSAPP_NUMBER ?? '');
export const WHATSAPP_NUMBER: string = /x/i.test(raw) ? '' : raw.replace(/\D/g, '');

/** wa.me deep link with a prefilled message, or `/contact` while the number is unset. */
export function waLink(message: string): string {
  if (!WHATSAPP_NUMBER) return '/contact';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function tierMessage(serviceName: string, tierLabel: string, price: number | null): string {
  if (price === null) return `Hi Tech Pravaha, I'd like a quote for ${serviceName} · ${tierLabel}.`;
  return `Hi Tech Pravaha, I want to buy ${serviceName} · ${tierLabel} (${formatINR(price)} + GST).`;
}
