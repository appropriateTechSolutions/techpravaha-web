/**
 * Journal topic queue: load, validate, pick the next topic, mark one drafted.
 * Node-side only (fs). The queue is `content/journal-topics.json`.
 */
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { LIMITS } from './limits';

export const DEFAULT_TOPICS_PATH = 'content/journal-topics.json';

export const TOPIC_STATUSES = ['queued', 'drafted', 'published'] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export interface Topic {
  slug: string;
  title: string;
  angle: string;
  status: TopicStatus;
  draftedAt?: string;
  pr?: string;
}

const SLUG_RE = /^[a-z0-9-]+$/;
const EM_DASH = '\u2014';
const MAX_TITLE = LIMITS.title;

function fail(msg: string): never {
  throw new Error(`topics: ${msg}`);
}

/** Throws `Error('topics: ...')` on the first problem found. */
export function validateTopics(topics: unknown): asserts topics is Topic[] {
  if (!Array.isArray(topics)) fail('expected an array');
  const seen = new Set<string>();
  topics.forEach((raw, i) => {
    const t = raw as Partial<Topic> | null;
    if (!t || typeof t !== 'object') fail(`entry ${i} is not an object`);
    const { slug, title, angle, status } = t;
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) fail(`entry ${i} has an invalid slug "${String(slug)}"`);
    if (seen.has(slug)) fail(`duplicate slug "${slug}"`);
    seen.add(slug);
    if (!TOPIC_STATUSES.includes(status as TopicStatus)) fail(`"${slug}" has an invalid status "${String(status)}"`);
    if (typeof title !== 'string' || !title.trim()) fail(`"${slug}" needs a title`);
    if (title.length > MAX_TITLE) fail(`"${slug}" title is over ${MAX_TITLE} characters`);
    if (typeof angle !== 'string' || !angle.trim()) fail(`"${slug}" needs an angle`);
    if (title.includes(EM_DASH) || angle.includes(EM_DASH)) fail(`"${slug}" contains an em-dash`);
    if (t.draftedAt !== undefined && typeof t.draftedAt !== 'string') fail(`"${slug}" draftedAt must be a string`);
    if (t.pr !== undefined && typeof t.pr !== 'string') fail(`"${slug}" pr must be a string`);
  });
}

export function loadTopics(path: string = DEFAULT_TOPICS_PATH): Topic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(`cannot read ${path}: ${(err as Error).message}`);
  }
  const topics = (parsed as { topics?: unknown } | null)?.topics;
  validateTopics(topics);
  return topics;
}

/** First `queued` topic in file order, or null when the queue is empty. */
export function nextTopic(topics: Topic[]): Topic | null {
  return topics.find((t) => t.status === 'queued') ?? null;
}

/** Flip a topic to `drafted`. Writes a temp file in the same dir, then renames over the original. */
export function markDrafted(path: string, slug: string, info: { draftedAt: string; pr?: string }): void {
  const topics = loadTopics(path);
  const topic = topics.find((t) => t.slug === slug);
  if (!topic) fail(`unknown slug "${slug}"`);
  topic.status = 'drafted';
  topic.draftedAt = info.draftedAt;
  if (info.pr !== undefined) topic.pr = info.pr;
  validateTopics(topics);

  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, `${JSON.stringify({ topics }, null, 2)}\n`);
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // temp file never created
    }
    throw err;
  }
}
