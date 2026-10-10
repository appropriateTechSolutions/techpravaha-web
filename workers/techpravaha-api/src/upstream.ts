/** Shared plumbing for the Sheet and Resend calls. */

export const UPSTREAM_TIMEOUT_MS = 10_000;

// Bound at call time so tests can stub globalThis.fetch, and so `fetch` is never called with a foreign `this`.
export const globalFetch: typeof fetch = (input, init) => fetch(input, init);

/**
 * A failure whose message is safe to put in an alert email: our own wording plus an HTTP status
 * at most, never an upstream body, URL or customer field.
 */
export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/**
 * Alert-safe description of any thrown value. Our own UpstreamError messages pass through;
 * anything else is reduced to its error name (TimeoutError, TypeError, ...) because runtime
 * messages can embed request URLs that carry tokens.
 */
export function safeErrorText(err: unknown): string {
  if (err instanceof UpstreamError) return err.message;
  if (err instanceof Error || err instanceof DOMException) return err.name || 'Error';
  return 'unknown error';
}
