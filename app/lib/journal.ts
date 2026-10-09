/**
 * Journal loader. Posts are `app/content/journal/YYYY-MM-DD-<slug>.md` with a
 * small frontmatter block. Everything is parsed at import time, so bad content
 * fails the build (and the tests) instead of shipping a broken page.
 * The slug rule matches journalRoutes() in scripts/lib/paths.ts.
 */
import { marked } from 'marked';
import { parseFrontmatter } from './frontmatter';

export { parseFrontmatter };

export interface Post {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  tags: string[];
  html: string;
  readingMinutes: number;
}

const FILE_RE = /^\d{4}-\d{2}-\d{2}-(.+)\.md$/;
const WORDS_PER_MINUTE = 200;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function toPost(path: string, raw: string): Post {
  const file = path.split('/').pop() ?? path;
  const slug = FILE_RE.exec(file)?.[1];
  if (!slug) throw new Error(`journal: file name must be YYYY-MM-DD-<slug>.md, got ${file}`);

  const { data, body } = parseFrontmatter(raw, file);
  const summary = data.summary;
  if (typeof summary !== 'string' || !summary) throw new Error(`journal: missing summary in ${file}`);
  const tags = Array.isArray(data.tags) ? data.tags : [];

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    summary,
    tags,
    html: marked.parse(body, { async: false }),
    readingMinutes: Math.max(1, Math.round(countWords(body) / WORDS_PER_MINUTE)),
  };
}

const FILES = import.meta.glob<string>('../content/journal/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Newest first; same-day posts fall back to slug order (a to z) so the list is stable. Returns a new array. */
export function sortPosts<T extends Pick<Post, 'date' | 'slug'>>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1,
  );
}

export const POSTS: Post[] = sortPosts(Object.entries(FILES).map(([path, raw]) => toPost(path, raw)));

export const JOURNAL_SLUGS: string[] = POSTS.map((p) => p.slug);

const dupes = JOURNAL_SLUGS.filter((s, i) => JOURNAL_SLUGS.indexOf(s) !== i);
if (dupes.length) throw new Error(`journal: duplicate slug ${dupes.join(', ')}`);

export function getPost(slug: string | undefined): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2026-10-10` → `10 Oct 2026`, pinned to UTC so server and browser agree. */
export function formatPostDate(date: string): string {
  return DATE_FORMAT.format(new Date(date));
}
