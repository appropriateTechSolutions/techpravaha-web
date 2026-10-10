// @vitest-environment node
/**
 * A post the draft pipeline would write must pass the same per-post rules the site test applies to
 * app/content/journal. Renders canned drafts through write.ts into a temp journal dir and reads them back.
 */
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Draft } from '../scripts/journal/generate';
import { LIMITS } from '../scripts/journal/limits';
import { catalogueAmounts, lintDraft } from '../scripts/journal/lint';
import { wordCount } from '../scripts/lib/voice';
import { writeDraft } from '../scripts/journal/write';
import { journalPostProblems } from './helpers/journal-post';

const DATE = '2026-10-19';
const PARA =
  'You get one page with up to six sections, written to one goal and built for a phone first. Each section has a job, and we can name it in one line.';

/** A body of `sections` ## sections, four paragraphs each, opening and closing with a short paragraph. */
function body(sections: number): string {
  const parts = ['A Launch page costs ₹35,000 before GST. This post walks through what that price covers and why.'];
  for (let i = 1; i <= sections; i++) parts.push(`## Part ${i}`, Array(4).fill(PARA).join(' '));
  parts.push('Read the full list on the [pricing page](/pricing) and message us when you are ready.');
  return parts.join('\n\n');
}

function draft(sections: number): Draft {
  return {
    title: 'What a ₹35,000 landing page includes and why',
    summary: 'Each line of the Launch package, what it is for, and what we leave out on purpose.',
    tags: ['websites', 'pricing'],
    body: body(sections),
    captions: {
      linkedin: 'One page, one goal, six sections. https://techpravaha.com/journal/x/',
      x: 'One page, one goal, six sections.',
      whatsapp: 'New on the journal: what a Launch landing page includes.',
    },
  };
}

function renderAndRead(d: Draft, slug: string): { file: string; raw: string } {
  const root = mkdtempSync(join(tmpdir(), 'journal-compat-'));
  writeDraft(d, { slug }, DATE, root);
  const dir = join(root, 'app/content/journal');
  const [file] = readdirSync(dir);
  return { file: file!, raw: readFileSync(join(dir, file!), 'utf8') };
}

describe('pipeline output meets the site journal rules', () => {
  // The short end and the long end of what the lint lets through; the long one is over the seeds' 600.
  for (const sections of [3, 5]) {
    it(`a lint-clean ${sections}-section draft passes the site's per-post checks`, () => {
      const d = draft(sections);
      const words = wordCount(d.body);
      expect(words).toBeGreaterThanOrEqual(LIMITS.minWords);
      expect(words).toBeLessThanOrEqual(LIMITS.maxWords);
      if (sections === 5) expect(words).toBeGreaterThan(600);

      expect(lintDraft(d, { allowedAmounts: catalogueAmounts(), date: DATE })).toMatchObject({ ok: true, problems: [] });
      const { file, raw } = renderAndRead(d, 'a-compat-post');
      expect(file).toBe(`${DATE}-a-compat-post.md`);
      expect(journalPostProblems(raw, file)).toEqual([]);
    });
  }

  it('both rule sets use the same word limits', () => {
    const over = draft(6);
    expect(wordCount(over.body)).toBeGreaterThan(LIMITS.maxWords);
    expect(lintDraft(over, { allowedAmounts: catalogueAmounts(), date: DATE }).problems.some((p) => p.startsWith('body is'))).toBe(true);
    const { file, raw } = renderAndRead(over, 'too-long');
    expect(journalPostProblems(raw, file).join('\n')).toMatch(/words, expected 400 to 700/);
  });
});
