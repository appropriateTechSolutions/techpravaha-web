import { useSyncExternalStore } from 'react';

/** Shared easing for reveals and counters (matches --ease-out-expo in theme.css). */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const noop = () => () => {};

/**
 * False while React hydrates prerendered HTML, true on every later render and on
 * fresh client renders. Lets motion components render the server's markup during
 * hydration (no mismatch) and switch to reduced-motion output right after.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
