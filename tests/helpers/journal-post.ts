/**
 * The per-post rules every file in app/content/journal must meet. Shared by tests/journal.test.ts
 * (the files on disk) and tests/journal-pipeline-compat.test.ts (a post rendered by the draft
 * pipeline), so the site's rules and the pipeline's output cannot drift apart.
 */
import { countWords, parseFrontmatter } from '../../app/lib/journal';
import { LIMITS } from '../../scripts/journal/limits';

/** Body word range for any post: the pipeline's own limits. */
export const POST_WORDS = { min: LIMITS.minWords, max: LIMITS.maxWords } as const;

/** Returns every rule the raw post breaks; an empty list means it passes. */
export function journalPostProblems(
  raw: string,
  file: string,
  words: { min: number; max: number } = POST_WORDS,
): string[] {
  const problems: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(file)) problems.push(`${file}: file name is not YYYY-MM-DD-<slug>.md`);
  try {
    const { data, body } = parseFrontmatter(raw, file);
    if (typeof data.summary !== 'string' || !data.summary) problems.push(`${file}: no summary`);
    const n = countWords(body);
    if (n < words.min || n > words.max) problems.push(`${file}: ${n} words, expected ${words.min} to ${words.max}`);
  } catch (err) {
    problems.push(`${file}: ${(err as Error).message}`);
  }
  if (raw.includes('\u2014')) problems.push(`${file}: em-dash`);
  if (/^# /m.test(raw)) problems.push(`${file}: an h1 heading (the page owns the h1)`);
  return problems;
}
