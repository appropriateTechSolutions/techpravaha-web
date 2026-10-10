// Tiny in-memory stand-in for a KV namespace: get (text or { type: 'json' }), put (with expirationTtl), delete.
export function fakeKV() {
  const map = new Map<string, string>();
  const puts: string[] = [];
  const ttls = new Map<string, number | undefined>();
  return {
    map,
    puts,
    ttls,
    async get(key: string, opts?: { type?: 'json' | 'text' }): Promise<unknown> {
      const v = map.get(key);
      if (v === undefined) return null;
      return opts?.type === 'json' ? JSON.parse(v) : v;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
      puts.push(key);
      map.set(key, value);
      ttls.set(key, opts?.expirationTtl);
    },
    async delete(key: string): Promise<void> {
      map.delete(key);
    },
  };
}
export type FakeKV = ReturnType<typeof fakeKV>;
