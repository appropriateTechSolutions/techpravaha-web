import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadTopics,
  markDrafted,
  nextTopic,
  validateTopics,
  type Topic,
} from '../scripts/journal/topics';

const SEED = 'content/journal-topics.json';

function topic(over: Partial<Topic> = {}): Topic {
  return { slug: 'a-topic', title: 'A topic', angle: 'An angle.', status: 'queued', ...over };
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'journal-topics-'));
}

describe('nextTopic', () => {
  it('picks the first queued topic in file order and skips drafted ones', () => {
    const topics = [
      topic({ slug: 'one', status: 'drafted' }),
      topic({ slug: 'two', status: 'published' }),
      topic({ slug: 'three' }),
      topic({ slug: 'four' }),
    ];
    expect(nextTopic(topics)?.slug).toBe('three');
  });

  it('returns null when nothing is queued', () => {
    expect(nextTopic([topic({ status: 'drafted' })])).toBeNull();
    expect(nextTopic([])).toBeNull();
  });
});

describe('markDrafted', () => {
  it('flips status, records draftedAt and pr, and leaves valid JSON with no temp file', () => {
    const dir = tmpDir();
    const file = join(dir, 'topics.json');
    copyFileSync(SEED, file);
    const first = loadTopics(file)[0];

    markDrafted(file, first.slug, { draftedAt: '2026-10-12T03:00:00.000Z', pr: 'https://example.test/pull/1' });

    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { topics: Topic[] };
    const updated = parsed.topics.find((t) => t.slug === first.slug);
    expect(updated?.status).toBe('drafted');
    expect(updated?.draftedAt).toBe('2026-10-12T03:00:00.000Z');
    expect(updated?.pr).toBe('https://example.test/pull/1');
    expect(parsed.topics.filter((t) => t.status === 'queued')).toHaveLength(parsed.topics.length - 1);
    expect(readdirSync(dir)).toEqual(['topics.json']);
    // The same topic run twice: the second selection skips it.
    expect(nextTopic(loadTopics(file))?.slug).not.toBe(first.slug);
  });

  it('throws on an unknown slug and leaves the file untouched', () => {
    const dir = tmpDir();
    const file = join(dir, 'topics.json');
    copyFileSync(SEED, file);
    const before = readFileSync(file, 'utf8');
    expect(() => markDrafted(file, 'nope', { draftedAt: '2026-10-12T03:00:00.000Z' })).toThrow(/topics: /);
    expect(readFileSync(file, 'utf8')).toBe(before);
    expect(readdirSync(dir)).toEqual(['topics.json']);
  });
});

describe('validateTopics', () => {
  it('accepts a valid list', () => {
    expect(() => validateTopics([topic(), topic({ slug: 'b-topic' })])).not.toThrow();
  });

  it('rejects a duplicate slug', () => {
    expect(() => validateTopics([topic(), topic()])).toThrow(/topics: .*duplicate/i);
  });

  it('rejects a bad slug', () => {
    expect(() => validateTopics([topic({ slug: 'Bad Slug' })])).toThrow(/topics: .*slug/i);
  });

  it('rejects a bad status', () => {
    expect(() => validateTopics([topic({ status: 'done' as Topic['status'] })])).toThrow(/topics: .*status/i);
  });

  it('rejects an em-dash in title or angle', () => {
    expect(() => validateTopics([topic({ title: 'One \u2014 two' })])).toThrow(/topics: .*em-dash/i);
    expect(() => validateTopics([topic({ angle: 'One \u2014 two' })])).toThrow(/topics: .*em-dash/i);
  });

  it('rejects a title over 90 characters', () => {
    expect(() => validateTopics([topic({ title: 'x'.repeat(91) })])).toThrow(/topics: .*title/i);
  });

  it('validates the seed file', () => {
    const topics = loadTopics(SEED);
    expect(topics).toHaveLength(6);
    expect(topics.every((t) => t.status === 'queued')).toBe(true);
    expect(() => validateTopics(topics)).not.toThrow();
  });
});

describe('journal:draft CLI', () => {
  function run(args: string[], env: Record<string, string>) {
    return spawnSync('npx', ['tsx', 'scripts/journal/draft.ts', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
  }

  it('--dry-run with an empty queue exits 0 and says so', () => {
    const file = join(tmpDir(), 'topics.json');
    writeFileSync(file, JSON.stringify({ topics: [topic({ status: 'drafted' })] }));
    const res = run(['--dry-run'], { JOURNAL_TOPICS_PATH: file });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('journal: no queued topics');
  }, 30_000);

  it('--dry-run prints the first queued topic and both prompts', () => {
    const res = run(['--dry-run'], { JOURNAL_TOPICS_PATH: join(process.cwd(), SEED) });
    const first = loadTopics(SEED)[0];
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(first.slug);
    expect(res.stdout).toContain('=== system prompt ===');
    expect(res.stdout).toContain('=== user prompt ===');
    expect(res.stdout).toContain(`Title: ${first.title}`);
  }, 30_000);

  it('--slug forces a topic', () => {
    const forced = loadTopics(SEED)[2];
    const res = run(['--dry-run', '--slug', forced.slug], { JOURNAL_TOPICS_PATH: join(process.cwd(), SEED) });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(forced.title);
  }, 30_000);

  it('--slug with an unknown slug exits non-zero', () => {
    const res = run(['--dry-run', '--slug', 'nope'], { JOURNAL_TOPICS_PATH: join(process.cwd(), SEED) });
    expect(res.status).not.toBe(0);
  }, 30_000);
});
