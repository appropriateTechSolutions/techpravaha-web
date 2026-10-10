/**
 * House voice rules that can be checked mechanically. Shared by the site copy tests
 * (tests/content.test.ts) and the journal draft lint (scripts/journal/lint.ts).
 */

/** Words the house voice never uses. Matched as whole words, case-insensitive. */
export const SUPERLATIVES = [
  'best',
  'world-class',
  'cutting-edge',
  'seamless',
  'seamlessly',
  'leading',
  'fastest',
  'perfect',
  'ultimate',
] as const;

export const EM_DASH_RE = /\u2014/;
/** En-dashes are checked in journal drafts only; site copy tests stay em-dash only. */
export const EN_DASH_RE = /\u2013/;

/** "leading" counts only as an adjective ("leading agency", "industry-leading"), not in "leading to". */
const SUPERLATIVE_RE = new RegExp(
  `\\b(${SUPERLATIVES.map((w) => (w === 'leading' ? 'leading(?!\\s+to\\b)' : w)).join('|')})\\b`,
  'gi',
);

export function hasEmDash(s: string): boolean {
  return EM_DASH_RE.test(s);
}

export function hasEnDash(s: string): boolean {
  return EN_DASH_RE.test(s);
}

/** Blocklisted words found in `s`, lower-cased, unique, in first-seen order. */
export function findSuperlatives(s: string): string[] {
  const found = new Set<string>();
  for (const m of s.matchAll(SUPERLATIVE_RE)) found.add(m[1]!.toLowerCase());
  return [...found];
}

/** Same rule as countWords in app/lib/journal.ts: whitespace-separated tokens with a letter or digit. */
export function wordCount(s: string): number {
  return s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
