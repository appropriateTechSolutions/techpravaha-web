/**
 * Cutover gate: fails if any prerendered page (or any SVG image, where the screenshot placeholders
 * live) still shows a bracketed placeholder such as [GSTIN], [timeline pending] or
 * [screenshot pending], in its text or in its alt, title, aria-label, placeholder or meta content
 * attributes.
 *   tsx scripts/check-placeholders.ts [dir]     (default build/client; run npm run build first)
 * Prints file:match for every hit and exits 1, or prints a one-line pass and exits 0.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A bracketed phrase that starts with a letter: 3 to 41 characters inside the brackets. */
export const PLACEHOLDER_RE = /\[[A-Za-z][^\]]{2,40}\]/g;

/** Attributes whose values a reader or a crawler sees: alt text, titles, labels, meta content. */
const READABLE_ATTR_RE = /\s(?:alt|title|aria-label|placeholder|content)="([^"]*)"/gi;

/**
 * What a reader or a crawler sees in a page: text between tags plus readable attribute values.
 * Scripts, styles and other attributes are dropped, so router code (`[b+1]`) and Tailwind arbitrary
 * values in class names (`[minmax(0,1fr)]`) are not reported.
 */
export function readableText(html: string): string {
  const noCode = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const attrs = [...noCode.matchAll(READABLE_ATTR_RE)].map((m) => m[1]!);
  const text = noCode.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
  return [text, ...attrs].join('\n');
}

export function findPlaceholders(dir: string): string[] {
  const hits: string[] = [];
  const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => /\.(html|svg)$/.test(f)).sort();
  for (const f of files) {
    const text = readableText(readFileSync(join(dir, f), 'utf8'));
    const name = relative(dir, join(dir, f)).split(sep).join('/');
    for (const m of new Set(text.match(PLACEHOLDER_RE) ?? [])) hits.push(`${name}:${m}`);
  }
  return hits;
}

function main(): void {
  const dir = resolve(process.argv[2] ?? 'build/client');
  if (!existsSync(dir)) {
    console.error(`check-placeholders: ${dir} does not exist; run npm run build first`);
    process.exit(1);
  }
  const hits = findPlaceholders(dir);
  if (hits.length === 0) {
    console.log(`check-placeholders: no bracketed placeholders in ${dir}`);
    return;
  }
  console.error(`check-placeholders: ${hits.length} bracketed placeholder(s) in ${dir}:`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
