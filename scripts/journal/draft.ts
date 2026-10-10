/**
 * Journal draft CLI.
 *   tsx scripts/journal/draft.ts [--dry-run] [--slug <slug>] [--date YYYY-MM-DD] [--summary <path>]
 * Picks the next queued topic (or --slug), asks Claude for a draft, lints it, writes the post and
 * its social sidecar, and marks the topic drafted. Any lint problem fails the run with exit 1 and
 * nothing written. If marking the topic drafted fails after the write, the files stay on disk and the
 * error prints the recovery step. --dry-run prints the topic and both prompts and makes no API call.
 * --summary writes a machine-readable JSON summary (DraftSummary) after a drafted run, and also on a
 * lint failure (with lintProblems filled, plus the full draft in `<summary>.draft.json`, then exit 1);
 * the PR workflow reads it. Nothing is written for
 * an empty queue, a dry run or a non-lint error.
 * JOURNAL_TOPICS_PATH overrides the topics file (used by tests). Needs ANTHROPIC_API_KEY (or an
 * `ant auth login` profile) for a real run.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Anthropic from '@anthropic-ai/sdk';
import { isValidDate } from '../../app/lib/frontmatter';
import { generateDraft, type Captions } from './generate';
import { catalogueAmounts, lintDraft } from './lint';
import { buildSystemPrompt, buildUserPrompt, REPO_ROOT } from './prompt';
import { DEFAULT_TOPICS_PATH, loadTopics, markDrafted, nextTopic, type Topic } from './topics';
import { draftPaths, writeDraft } from './write';

export interface RunOptions {
  dryRun?: boolean;
  slug?: string;
  /** Publish date, YYYY-MM-DD. Defaults to today (UTC). */
  date?: string;
  topicsPath?: string;
  /** Where app/content/journal and content/social live. Defaults to the repo root. */
  root?: string;
  client?: Anthropic;
  /** Write a DraftSummary JSON here after a drafted run or a lint failure. */
  summaryPath?: string;
  log?: (line: string) => void;
}

export type RunResult =
  | { status: 'empty' }
  | { status: 'dry-run'; topic: Topic }
  | { status: 'drafted'; topic: Topic; paths: { post: string; social: string }; words: number };

/** What the PR workflow reads. Paths are relative to the repo root, with forward slashes. */
export interface DraftSummary {
  slug: string;
  title: string;
  date: string;
  postPath: string;
  socialPath: string;
  wordCount: number;
  lintProblems: string[];
  captions: Captions;
}

export function parseArgs(argv: string[]): { dryRun: boolean; slug?: string; date?: string; summary?: string } {
  const args: { dryRun: boolean; slug?: string; date?: string; summary?: string } = { dryRun: false };
  const value = (flag: string, v: string | undefined): string => {
    if (!v || v.startsWith('--')) throw new Error(`journal: ${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--slug') args.slug = value(a, argv[++i]);
    else if (a === '--summary') args.summary = value(a, argv[++i]);
    else if (a === '--date') {
      args.date = value(a, argv[++i]);
      if (!isValidDate(args.date)) throw new Error(`journal: --date must be a real YYYY-MM-DD date, got "${args.date}"`);
    } else throw new Error(`journal: unknown argument "${a}"`);
  }
  return args;
}

function pickTopic(topics: Topic[], slug?: string): Topic | null {
  if (!slug) return nextTopic(topics);
  const forced = topics.find((t) => t.slug === slug);
  if (!forced) throw new Error(`journal: no topic with slug "${slug}"`);
  return forced;
}

const rel = (root: string, p: string): string => relative(root, p).split(sep).join('/');

/** Where a lint failure writes the full draft: next to the summary, `<name>.draft.json`. */
export function draftJsonPath(summaryPath: string): string {
  return summaryPath.replace(/(\.json)?$/, '.draft.json');
}

export async function runDraft(opts: RunOptions = {}): Promise<RunResult> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const topicsPath = opts.topicsPath ?? DEFAULT_TOPICS_PATH;
  const root = opts.root ?? REPO_ROOT;
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  if (!isValidDate(date)) throw new Error(`journal: date must be a real YYYY-MM-DD date, got "${date}"`);

  const topic = pickTopic(loadTopics(topicsPath), opts.slug);
  if (!topic) {
    log('journal: no queued topics');
    return { status: 'empty' };
  }
  if (topic.status !== 'queued') {
    if (!opts.dryRun) throw new Error(`journal: "${topic.slug}" is ${topic.status}; only queued topics can be drafted`);
    log(`journal: note, "${topic.slug}" is already ${topic.status}`);
  }

  log(`topic: ${topic.slug}`);
  log(`title: ${topic.title}`);
  log(`angle: ${topic.angle}`);

  if (opts.dryRun) {
    log('=== system prompt ===');
    log(buildSystemPrompt());
    log('=== user prompt ===');
    log(buildUserPrompt(topic));
    return { status: 'dry-run', topic };
  }

  // Fail before paying for a call whose output could not be written.
  const planned = draftPaths(topic, date, root);
  for (const p of [planned.post, planned.social]) {
    if (existsSync(p)) throw new Error(`journal: ${p} already exists, refusing to overwrite`);
  }

  const draft = await generateDraft(topic, { client: opts.client });
  const lint = lintDraft(draft, { allowedAmounts: catalogueAmounts(), topic, date });
  const summary = (problems: string[]): DraftSummary => ({
    slug: topic.slug,
    title: draft.title,
    date,
    postPath: rel(root, planned.post),
    socialPath: rel(root, planned.social),
    wordCount: lint.words,
    lintProblems: problems,
    captions: draft.captions,
  });
  if (!lint.ok) {
    if (opts.summaryPath) {
      writeFileSync(opts.summaryPath, JSON.stringify(summary(lint.problems), null, 2) + '\n');
      // The full draft too, so a one-word problem can be fixed by hand instead of paying for a re-run.
      writeFileSync(draftJsonPath(opts.summaryPath), JSON.stringify(draft, null, 2) + '\n');
    }
    throw new Error(`journal: lint failed for "${topic.slug}", nothing written:\n${lint.problems.map((p) => `- ${p}`).join('\n')}`);
  }

  const paths = writeDraft(draft, topic, date, root);
  // Not atomic with the write: if markDrafted fails, both files stay on disk and the topic stays
  // queued, so a re-run would refuse to overwrite them. The error names the recovery step.
  try {
    markDrafted(topicsPath, topic.slug, { draftedAt: new Date().toISOString() });
  } catch (err) {
    throw new Error(
      `journal: wrote ${paths.post} and ${paths.social} but could not mark "${topic.slug}" drafted in ${topicsPath}: ${(err as Error).message}\n` +
        `Recovery: set its status to "drafted" in ${topicsPath} by hand, or delete both files and re-run.`,
    );
  }

  if (opts.summaryPath) writeFileSync(opts.summaryPath, JSON.stringify(summary([]), null, 2) + '\n');

  log(`post: ${paths.post}`);
  log(`social: ${paths.social}`);
  log(`words: ${lint.words}`);
  log('lint: ok (em-dashes, superlatives, word count, lengths, amounts, links, headings, client names, frontmatter)');
  return { status: 'drafted', topic, paths, words: lint.words };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { summary, ...rest } = args;
  await runDraft({ ...rest, summaryPath: summary, topicsPath: process.env.JOURNAL_TOPICS_PATH || DEFAULT_TOPICS_PATH });
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err: unknown) => {
    console.error((err as Error).message);
    process.exit(1);
  });
}
