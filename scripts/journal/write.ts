/**
 * Render a draft to disk: the journal post (frontmatter + body) and a social sidecar with the three
 * captions. Never overwrites an existing file.
 */
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Draft } from './generate';
import { postUrl, REPO_ROOT } from './prompt';
import type { Topic } from './topics';

/** The post file: plain `key: value` frontmatter, as app/lib/frontmatter.ts parses it. */
export function renderPost(draft: Draft, date: string): string {
  return [
    '---',
    `title: ${draft.title}`,
    `date: ${date}`,
    `summary: ${draft.summary}`,
    `tags: ${draft.tags.join(', ')}`,
    '---',
    '',
    draft.body.trimEnd(),
    '',
  ].join('\n');
}

export function renderSocial(draft: Draft, topic: Pick<Topic, 'slug'>): string {
  return [
    `# Social captions: ${draft.title}`,
    '',
    `Post: ${postUrl(topic.slug)}`,
    '',
    '## LinkedIn',
    '',
    draft.captions.linkedin,
    '',
    '## X',
    '',
    draft.captions.x,
    '',
    '## WhatsApp status',
    '',
    draft.captions.whatsapp,
    '',
  ].join('\n');
}

export function draftPaths(topic: Pick<Topic, 'slug'>, date: string, root: string = REPO_ROOT): { post: string; social: string } {
  return {
    post: join(root, 'app/content/journal', `${date}-${topic.slug}.md`),
    social: join(root, 'content/social', `${topic.slug}.md`),
  };
}

/** Writes both files, or neither. Throws `Error('journal: ...')` if either already exists. */
export function writeDraft(
  draft: Draft,
  topic: Pick<Topic, 'slug'>,
  date: string,
  root: string = REPO_ROOT,
): { post: string; social: string } {
  const paths = draftPaths(topic, date, root);
  for (const p of [paths.post, paths.social]) {
    if (existsSync(p)) throw new Error(`journal: ${p} already exists, refusing to overwrite`);
  }
  mkdirSync(dirname(paths.post), { recursive: true });
  mkdirSync(dirname(paths.social), { recursive: true });
  writeFileSync(paths.post, renderPost(draft, date), { flag: 'wx' });
  try {
    writeFileSync(paths.social, renderSocial(draft, topic), { flag: 'wx' });
  } catch (err) {
    unlinkSync(paths.post);
    throw err;
  }
  return paths;
}
