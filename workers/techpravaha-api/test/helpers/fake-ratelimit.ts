// In-memory stand-in for a Workers Rate Limiting binding: `limit` allowed calls per key, no window.
export function fakeRateLimit(limit: number) {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  return {
    counts,
    keys,
    async limit({ key }: { key: string }): Promise<{ success: boolean }> {
      keys.push(key);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
  };
}
export type FakeRateLimit = ReturnType<typeof fakeRateLimit>;
