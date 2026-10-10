import { useSearchParams } from 'react-router';
import { ORDER_ID_RE } from './api';
import { useHydrated } from './motion';

/**
 * The Razorpay order id from `?order=`, or undefined. Prerendered HTML has no query
 * string, so this stays undefined until hydration finishes (no markup mismatch).
 * Anything that does not look like an order id is ignored, so it is never sent to the
 * API or written into a message.
 */
export function useOrderParam(): string | undefined {
  const [params] = useSearchParams();
  const hydrated = useHydrated();
  const id = hydrated ? params.get('order') : null;
  return id && ORDER_ID_RE.test(id) ? id : undefined;
}
