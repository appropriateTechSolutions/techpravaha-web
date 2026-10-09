/** Run `fn` when the main thread is idle (setTimeout 0 where requestIdleCallback is missing). Returns a cancel. */
export function whenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => fn());
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
}
