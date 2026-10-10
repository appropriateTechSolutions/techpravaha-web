/**
 * Frontmatter parser for journal posts. Pure (no Vite APIs), so both the app
 * (app/lib/journal.ts) and the Node post-build script (scripts/postbuild.ts) use it.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date: rejects 32-13-2026 and also 2026-02-30. */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) return false;
  return new Date(value).toISOString().slice(0, 10) === value;
}

/**
 * Parse a leading `---` block of `key: value` lines. `tags` is a comma list.
 * Throws on a missing block, a malformed line, a missing title/date, or an invalid date.
 */
export function parseFrontmatter(
  raw: string,
  file = 'post',
): { data: Record<string, string | string[]>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
  if (!match) throw new Error(`journal: missing frontmatter in ${file}`);

  const data: Record<string, string | string[]> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) throw new Error(`journal: malformed frontmatter line "${line}" in ${file}`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    data[key] =
      key === 'tags'
        ? value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : value;
  }

  const { title, date } = data;
  if (typeof title !== 'string' || !title || typeof date !== 'string' || !date) {
    throw new Error(`journal: missing title/date in ${file}`);
  }
  if (!isValidDate(date)) throw new Error(`journal: invalid date in ${file}`);

  return { data, body: raw.slice(match[0].length) };
}
