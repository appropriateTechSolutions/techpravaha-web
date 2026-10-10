/**
 * Razorpay Checkout.js, loaded only when a buyer presses Pay. Nothing here runs at
 * page load, so the checkout page stays as light as every other prerendered page.
 */

export const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const LOAD_TIMEOUT_MS = 8_000;

/**
 * Razorpay's modal accent. Checkout.js takes a literal colour, not a CSS variable, so
 * this mirrors `--ground` (dark) from app/theme.css. Like MetallicHero's colours, it is
 * the one justified exception to "no hex outside theme.css"; change both together.
 */
export const RAZORPAY_THEME_COLOR = '#0A0A0C';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** The subset of Checkout.js options this site uses. */
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open(): void;
}

export type RazorpayCtor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

// A key id is usable when set and not a `.env.example` placeholder (a run of X's), as in analytics.ts.
const usable = (id: unknown): id is string => typeof id === 'string' && id.trim() !== '' && !/x{4,}/i.test(id);

/**
 * False while VITE_RAZORPAY_KEY_ID is unset or a placeholder: the checkout page then
 * offers WhatsApp instead of a Pay button. The Worker's key id is what Checkout.js uses.
 */
export function paymentsEnabled(): boolean {
  return usable(import.meta.env.VITE_RAZORPAY_KEY_ID);
}

let pending: Promise<RazorpayCtor> | null = null;

/**
 * Injects Checkout.js once and resolves with `window.Razorpay`. Concurrent calls share
 * one load. Rejects on a script error or after 8 s (blocked by an ad blocker, offline);
 * a failed load removes its script tag, so the next call tries again from scratch.
 */
export function loadCheckout(): Promise<RazorpayCtor> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (pending) return pending;

  pending = new Promise<RazorpayCtor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;

    const timer = setTimeout(() => fail('Checkout.js timed out'), LOAD_TIMEOUT_MS);

    function done() {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    }
    function fail(reason: string) {
      done();
      script.remove();
      pending = null;
      reject(new Error(reason));
    }

    script.onload = () => {
      if (!window.Razorpay) return fail('Checkout.js loaded without Razorpay');
      done();
      resolve(window.Razorpay);
    };
    script.onerror = () => fail('Checkout.js failed to load');
    document.head.appendChild(script);
  });

  return pending;
}
