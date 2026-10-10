// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { DraftSummary } from '../scripts/journal/draft';
import { renderPrBody } from '../scripts/journal/pr-body';

const SUMMARY: DraftSummary = {
  slug: 'why-pick-us',
  title: 'What a ₹35,000 landing page includes and why',
  date: '2026-10-12',
  postPath: 'app/content/journal/2026-10-12-why-pick-us.md',
  socialPath: 'content/social/why-pick-us.md',
  wordCount: 523,
  lintProblems: [],
  captions: {
    linkedin: 'What does ₹35,000 buy in a landing page? One page, one goal.',
    x: 'One page, one goal, six sections.',
    whatsapp: 'New on the journal: what a Launch page includes.',
  },
};

describe('renderPrBody', () => {
  it('shows the summary line, word count, lint result, sidecar path and all three captions in code blocks', () => {
    const body = renderPrBody(SUMMARY);
    expect(body).toContain('Drafted "What a ₹35,000 landing page includes and why"');
    expect(body).toContain('Word count: 523');
    expect(body).toContain('Lint: all checks passed');
    expect(body).toContain('`content/social/why-pick-us.md`');
    expect(body).toContain('`app/content/journal/2026-10-12-why-pick-us.md`');
    for (const c of Object.values(SUMMARY.captions)) expect(body).toContain('```\n' + c + '\n```');
    expect(body).toMatch(/### LinkedIn[\s\S]*### X[\s\S]*### WhatsApp status/);
  });

  it('carries the review checklist and the merge and drafted notes', () => {
    const body = renderPrBody(SUMMARY);
    expect(body).toMatch(/- \[ \] Facts are true/);
    expect(body).toMatch(/- \[ \] Voice is right/);
    expect(body).toMatch(/- \[ \] Publish date is right \(2026-10-12/);
    expect(body).toMatch(/- \[ \] Captions are fine/);
    expect(body).toMatch(/Merging this PR publishes the post/);
    expect(body).toMatch(/drafted in `content\/journal-topics.json` on this branch only/);
    expect(body).toMatch(/close the PR and delete the branch/);
    expect(body).toMatch(/status to `published` or remove it from the queue/);
  });

  it('lists lint problems when there are any', () => {
    const body = renderPrBody({ ...SUMMARY, lintProblems: ['em-dash in body', 'word count 812'] });
    expect(body).not.toContain('all checks passed');
    expect(body).toContain('- em-dash in body');
  });

  it('keeps a caption containing backticks inside its code block', () => {
    const body = renderPrBody({ ...SUMMARY, captions: { ...SUMMARY.captions, x: 'Use ``` fences' } });
    expect(body).toContain('````\nUse ``` fences\n````');
  });

  it('has no em-dashes or en-dashes of its own', () => {
    expect(renderPrBody(SUMMARY)).not.toMatch(/[\u2014\u2013]/);
  });
});
