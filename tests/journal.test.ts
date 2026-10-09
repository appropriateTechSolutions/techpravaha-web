import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countWords, getPost, JOURNAL_SLUGS, parseFrontmatter, POSTS, sortPosts } from '../app/lib/journal';
import { prerenderPaths } from '../scripts/lib/paths';

const SAMPLE = `---
title: A sample post
date: 2026-10-10
summary: One sentence.
tags: pricing, studio , ops
---

## Heading

Body text here.
`;

describe('parseFrontmatter', () => {
  it('parses a sample', () => {
    const { data, body } = parseFrontmatter(SAMPLE, 'sample.md');
    expect(data.title).toBe('A sample post');
    expect(data.date).toBe('2026-10-10');
    expect(data.summary).toBe('One sentence.');
    expect(data.tags).toEqual(['pricing', 'studio', 'ops']);
    expect(body.trim()).toBe('## Heading\n\nBody text here.');
  });

  it('throws on a missing date', () => {
    const raw = SAMPLE.replace('date: 2026-10-10\n', '');
    expect(() => parseFrontmatter(raw, 'no-date.md')).toThrow('journal: missing title/date in no-date.md');
  });

  it('throws on a missing title', () => {
    const raw = SAMPLE.replace('title: A sample post\n', '');
    expect(() => parseFrontmatter(raw, 'no-title.md')).toThrow('journal: missing title/date in no-title.md');
  });

  it('throws on date: 32-13-2026', () => {
    const raw = SAMPLE.replace('date: 2026-10-10', 'date: 32-13-2026');
    expect(() => parseFrontmatter(raw, 'bad.md')).toThrow('journal: invalid date in bad.md');
  });

  it('throws on a well-shaped but impossible date', () => {
    const raw = SAMPLE.replace('date: 2026-10-10', 'date: 2026-02-30');
    expect(() => parseFrontmatter(raw, 'feb30.md')).toThrow('journal: invalid date in feb30.md');
  });

  it('throws when there is no frontmatter block', () => {
    expect(() => parseFrontmatter('## Just a body\n', 'bare.md')).toThrow(/journal: .*bare\.md/);
  });
});

describe('POSTS', () => {
  it('includes the seed posts', () => {
    expect(POSTS.length).toBeGreaterThanOrEqual(3);
    const titles = POSTS.map((p) => p.title);
    expect(titles).toContain('Why we put prices on the website');
    expect(titles).toContain("What a landing page actually needs (and what it doesn't)");
    expect(titles).toContain('Running a business from WhatsApp without losing your mind');
  });

  it('is sorted by date, newest first', () => {
    for (let i = 1; i < POSTS.length; i++) expect(POSTS[i - 1].date >= POSTS[i].date).toBe(true);
    expect(POSTS[0].slug).toBe('why-fixed-prices');
  });

  it('gives every post a reading time of at least one minute', () => {
    for (const p of POSTS) expect(p.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it('renders markdown to HTML strings', () => {
    for (const p of POSTS) {
      expect(typeof p.html).toBe('string');
      expect(p.html).toContain('<p>');
      expect(p.summary.length).toBeGreaterThan(0);
    }
  });

  it('derives slugs the same way as the prerender list', () => {
    expect(JOURNAL_SLUGS).toEqual(POSTS.map((p) => p.slug));
    const prerendered = prerenderPaths()
      .filter((p) => p.startsWith('/journal/'))
      .map((p) => p.slice('/journal/'.length));
    expect([...JOURNAL_SLUGS].sort()).toEqual([...prerendered].sort());
    expect(JOURNAL_SLUGS).toContain('why-fixed-prices');
  });

  it('finds posts by slug', () => {
    expect(getPost('why-fixed-prices')?.title).toBe('Why we put prices on the website');
    expect(getPost('nope')).toBeUndefined();
    expect(getPost(undefined)).toBeUndefined();
  });
});

describe('sortPosts', () => {
  it('orders differing dates newest first', () => {
    const input = [
      { slug: 'b', date: '2026-10-08' },
      { slug: 'a', date: '2026-10-10' },
      { slug: 'c', date: '2026-10-09' },
    ];
    expect(sortPosts(input).map((p) => p.date)).toEqual(['2026-10-10', '2026-10-09', '2026-10-08']);
    expect(input[0].slug).toBe('b'); // does not mutate
  });

  it('breaks same-date ties by slug, a to z', () => {
    const input = [
      { slug: 'zeta', date: '2026-10-10' },
      { slug: 'older', date: '2026-01-01' },
      { slug: 'alpha', date: '2026-10-10' },
    ];
    expect(sortPosts(input).map((p) => p.slug)).toEqual(['alpha', 'zeta', 'older']);
  });
});

describe('seed posts (raw markdown)', () => {
  const dir = join(process.cwd(), 'app/content/journal');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  it('exist', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');

    it(`${file} has 400 to 600 words`, () => {
      const { body } = parseFrontmatter(raw, file);
      const words = countWords(body);
      expect(words, `${file}: ${words} words`).toBeGreaterThanOrEqual(400);
      expect(words, `${file}: ${words} words`).toBeLessThanOrEqual(600);
    });

    it(`${file} has no em-dash`, () => {
      expect(raw).not.toContain('—');
    });

    it(`${file} leaves the h1 to the page`, () => {
      expect(raw).not.toMatch(/^# /m);
    });
  }
});
