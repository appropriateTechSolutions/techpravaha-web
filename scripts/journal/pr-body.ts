/**
 * Renders the pull-request body for a drafted journal post from the --summary JSON that draft.ts
 * writes, so the post can be reviewed from the PR page without opening any file.
 *   tsx scripts/journal/pr-body.ts <summary.json> [out.md]     (prints to stdout without out.md)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DraftSummary } from './draft';

function block(text: string): string[] {
  // A fence longer than any backtick run inside the caption keeps the caption from closing it early.
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = '`'.repeat(longest + 1);
  return [fence, text, fence];
}

export function renderPrBody(s: DraftSummary): string {
  const lint = s.lintProblems.length === 0 ? 'all checks passed' : `${s.lintProblems.length} problem(s):\n${s.lintProblems.map((p) => `- ${p}`).join('\n')}`;
  return [
    `Drafted "${s.title}" from the topic queue (\`${s.slug}\`), dated ${s.date}.`,
    '',
    `- Post: \`${s.postPath}\``,
    `- Word count: ${s.wordCount}`,
    `- Lint: ${lint}`,
    `- Social captions (copy for pasting; nothing posts automatically): \`${s.socialPath}\``,
    '',
    '## Captions',
    '',
    '### LinkedIn',
    '',
    ...block(s.captions.linkedin),
    '',
    '### X',
    '',
    ...block(s.captions.x),
    '',
    '### WhatsApp status',
    '',
    ...block(s.captions.whatsapp),
    '',
    '## Review checklist',
    '',
    '- [ ] Facts are true (no invented numbers, clients or prices)',
    '- [ ] Voice is right (plain, specific, no hype)',
    `- [ ] Publish date is right (${s.date}; edit \`date:\` in the frontmatter if not)`,
    '- [ ] Captions are fine to paste',
    '',
    'Merging this PR publishes the post (Cloudflare Pages deploys the site). The topic is marked drafted in `content/journal-topics.json` on this branch only, so `main` still has it queued until you merge. To abandon this draft, close the PR and delete the branch: the topic is drafted again on a later run. To retire the topic instead, set its status to `published` or remove it from the queue on `main`.',
    '',
  ].join('\n');
}

function main(): void {
  const [input, output] = process.argv.slice(2);
  if (!input) throw new Error('usage: tsx scripts/journal/pr-body.ts <summary.json> [out.md]');
  const body = renderPrBody(JSON.parse(readFileSync(input, 'utf8')) as DraftSummary);
  if (output) writeFileSync(output, body);
  else process.stdout.write(body);
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    main();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
