/**
 * Mechanical house-voice lint for a generated draft. Any problem fails the run before anything is
 * written. Checks every field the pipeline publishes: title, summary, tags, body and captions.
 */
import { parseFrontmatter } from '../../app/lib/frontmatter';
import { catalogue, chargedNow, withGst } from '../../app/lib/catalogue';
import { WORK } from '../../app/content/work';
import { findSuperlatives, hasEmDash, hasEnDash, wordCount } from '../lib/voice';
import type { Draft } from './generate';
import { LIMITS } from './limits';
import type { Topic } from './topics';
import { renderPost } from './write';

export interface LintResult {
  ok: boolean;
  problems: string[];
  /** Body word count, same rule as the site's reading time. */
  words: number;
}

export interface LintOptions {
  /** Rupee amounts the draft may quote, digits only (commas stripped). See catalogueAmounts(). */
  allowedAmounts: Set<string>;
  /** Percentages the draft may quote, as written before the % sign. Defaults to cataloguePercents(). */
  allowedPercents?: Set<string>;
  /**
   * The brief. A client name, a rupee amount or a percentage it states may also appear in the draft
   * (see briefFacts()).
   */
  topic?: Pick<Topic, 'title' | 'angle'>;
  /** Publish date used for the frontmatter round-trip. Defaults to today (UTC). */
  date?: string;
  /** Client names that must not appear unless the brief names them. Defaults to WORK `client` fields. */
  clients?: string[];
}

/** Mirrors rupeeAmounts in workers/techpravaha-api/src/prompt.ts: every ₹ / Rs / INR amount, digits only. */
export function rupeeAmounts(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?:₹|\bINR|\bRs\.?)[ \u00a0]*(\d+(?:[, \u00a0]\d+)*)/gi)) {
    out.push(m[1]!.replace(/[, \u00a0]/g, ''));
  }
  return out;
}

const MULTIPLIER: Record<string, number> = {
  rupee: 1,
  rupees: 1,
  rs: 1,
  inr: 1,
  thousand: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
};

/**
 * Amounts with a trailing unit ("35 thousand", "1.2 lakh", "35,000 rupees", "60,000 INR", "40000 Rs",
 * "60k rupees", "a 20,000-rupee job"), normalised to whole rupees as digits; `phrase` is the text as
 * written. A `k` after the number multiplies it by 1,000. A phrase that does not parse gives `amount: ''`.
 */
export function wordAmounts(text: string): { phrase: string; amount: string }[] {
  const out: { phrase: string; amount: string }[] = [];
  // A full stop only counts inside a number ("1.2"), never at its end, so "in 2026. Rupees are" is not an amount.
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)(?:\s*(k))?(?:\s*-\s*|\s*)(rupees?|lakhs?|crores?|thousand|rs|inr)\b/gi)) {
    const n = Number(m[1]!.replace(/,/g, '')) * (m[2] ? 1_000 : 1);
    const amount = Number.isFinite(n) ? String(Math.round(n * MULTIPLIER[m[3]!.toLowerCase()]!)) : '';
    out.push({ phrase: m[0], amount });
  }
  return out;
}

/**
 * Every amount the catalogue states or implies: prices, starting prices, GST totals, the GST on each
 * price, amounts due at checkout and the balance due at launch.
 */
export function catalogueAmounts(): Set<string> {
  const out = new Set<string>();
  const add = (n: number) => out.add(String(n));
  for (const s of catalogue.services) {
    for (const t of s.tiers) {
      if (t.from !== undefined) add(t.from);
      if (t.price !== null) {
        const total = withGst(t.price);
        const now = chargedNow({ price: t.price, depositPct: t.depositPct });
        add(t.price);
        add(total);
        add(total - t.price);
        add(now);
        if (total > now) add(total - now);
      }
    }
  }
  for (const a of catalogue.addons) add(a.from);
  return out;
}

/** Percentages the house voice may use: 18% GST, its 9% CGST and SGST halves, and the catalogue's deposit shares. */
export function cataloguePercents(): Set<string> {
  const out = new Set<string>(['18', '9']);
  for (const s of catalogue.services) {
    for (const t of s.tiers) if (t.depositPct !== undefined) out.add(String(t.depositPct));
  }
  return out;
}

const PERCENT_RE = /(\d+(?:\.\d+)?)\s?%/g;

/** The rupee amounts (digits only) and percentages (as written before %) that the brief itself states. */
export function briefFacts(topic: Pick<Topic, 'title' | 'angle'>): { amounts: string[]; percents: string[] } {
  const text = `${topic.title}\n${topic.angle}`;
  return {
    amounts: [...rupeeAmounts(text), ...wordAmounts(text).map((w) => w.amount).filter(Boolean)],
    percents: [...text.matchAll(PERCENT_RE)].map((m) => m[1]!),
  };
}

const ALLOWED_URL_RE = /^https:\/\/techpravaha\.com(?:[/?#]|$)/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:\s|$)/;
/** Thematic break: three or more of the same -, * or _, optionally spaced ("***", "----", "- - -"). */
const HR_RE = /^ {0,3}([-*_])(?: *\1){2,} *$/;
/** A pipe-table row or delimiter row. */
const TABLE_RE = /^ {0,3}\|.*\||^ {0,3}\|? *:?-{3,}:? *\| *:?-{3,}/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function lintDraft(draft: Draft, opts: LintOptions): LintResult {
  const problems: string[] = [];
  const allowedAmounts = new Set(opts.allowedAmounts);
  const allowedPercents = new Set(opts.allowedPercents ?? cataloguePercents());
  if (opts.topic) {
    const facts = briefFacts(opts.topic);
    for (const a of facts.amounts) allowedAmounts.add(a);
    for (const p of facts.percents) allowedPercents.add(p);
  }
  const fields: [string, string][] = [
    ['title', draft.title],
    ['summary', draft.summary],
    ['tags', draft.tags.join(', ')],
    ['body', draft.body],
    ['LinkedIn caption', draft.captions.linkedin],
    ['X caption', draft.captions.x],
    ['WhatsApp caption', draft.captions.whatsapp],
  ];

  for (const [name, text] of fields) {
    if (hasEmDash(text)) problems.push(`em-dash in ${name}`);
    if (hasEnDash(text)) problems.push(`en-dash in ${name}`);
    for (const word of findSuperlatives(text)) problems.push(`superlative "${word}" in ${name}`);
    for (const amount of rupeeAmounts(text)) {
      if (!allowedAmounts.has(amount)) problems.push(`amount ${amount} in ${name} is not a catalogue price`);
    }
    for (const { phrase, amount } of wordAmounts(text)) {
      if (!allowedAmounts.has(amount)) problems.push(`amount "${phrase}" in ${name} is not a catalogue price`);
    }
    // No invented statistics: only the GST rates, the catalogue's deposit shares and the brief's own figures.
    for (const m of text.matchAll(PERCENT_RE)) {
      if (!allowedPercents.has(m[1]!)) {
        problems.push(`percentage "${m[0]}" in ${name} (only GST, catalogue deposit and brief percentages are allowed)`);
      }
    }
    // Links: marked renders bare www. text, protocol-relative links and raw HTML, so all three count.
    for (const m of text.matchAll(/https?:\/\/[^\s)<>\]"']*/gi)) {
      if (!ALLOWED_URL_RE.test(m[0])) problems.push(`external link ${m[0]} in ${name}`);
    }
    for (const m of text.matchAll(/\bwww\.[^\s)<>\]"']*/gi)) problems.push(`bare www link ${m[0]} in ${name}`);
    if (/\]\(\s*\/\//.test(text)) problems.push(`protocol-relative link in ${name}`);
    for (const m of text.matchAll(/<\/?[a-z][^>]*>/gi)) problems.push(`raw HTML ${m[0]} in ${name}`);
  }

  const words = wordCount(draft.body);
  if (words < LIMITS.minWords || words > LIMITS.maxWords) {
    problems.push(`body is ${words} words, expected ${LIMITS.minWords} to ${LIMITS.maxWords}`);
  }
  if (draft.title.length > LIMITS.title) problems.push(`title is ${draft.title.length} characters, over ${LIMITS.title}`);
  if (draft.summary.length > LIMITS.summary) {
    problems.push(`summary is ${draft.summary.length} characters, over ${LIMITS.summary}`);
  }
  for (const key of ['linkedin', 'x', 'whatsapp'] as const) {
    const len = draft.captions[key].length;
    if (len > LIMITS.captions[key]) problems.push(`${key} caption is ${len} characters, over ${LIMITS.captions[key]}`);
  }

  // Body structure: ## headings, paragraphs, lists and links only. # (ATX or setext) would duplicate
  // the page title; ### and deeper are off-style; rules, code, tables and images are not house style.
  let fenced = false;
  let prev = '';
  for (const line of draft.body.split(/\r?\n/)) {
    if (/^ {0,3}(```|~~~)/.test(line)) {
      if (!fenced) problems.push('code block in body');
      fenced = !fenced;
      prev = line;
      continue;
    }
    if (fenced) continue;
    const h = HEADING_RE.exec(line);
    if (h && h[1]!.length !== 2) problems.push(`heading level ${h[1]!.length} in body: "${line.trim()}"`);
    if (/^ {0,3}=+ *$/.test(line) && prev.trim()) problems.push(`setext heading in body: "${prev.trim()}"`);
    if (line.trim() === '---') problems.push('a "---" line in body (a second frontmatter block or a horizontal rule)');
    else if (HR_RE.test(line)) problems.push(`horizontal rule in body: "${line.trim()}"`);
    if (TABLE_RE.test(line)) problems.push(`table in body: "${line.trim()}"`);
    if (/!\[/.test(line)) problems.push(`image in body: "${line.trim()}"`);
    prev = line;
  }

  const brief = opts.topic ? `${opts.topic.title}\n${opts.topic.angle}`.toLowerCase() : '';
  const clients = opts.clients ?? WORK.flatMap((w) => (w.client ? [w.client] : []));
  const all = fields.map(([, text]) => text).join('\n').toLowerCase();
  for (const client of clients) {
    const name = client.toLowerCase();
    if (all.includes(name) && !brief.includes(name)) problems.push(`client name "${client}" is not in the brief`);
  }

  // The frontmatter must survive a round trip through the site's parser unchanged.
  const date = opts.date ?? today();
  try {
    const { data, body } = parseFrontmatter(renderPost(draft, date), 'draft');
    const same =
      data.title === draft.title &&
      data.date === date &&
      data.summary === draft.summary &&
      JSON.stringify(data.tags) === JSON.stringify(draft.tags) &&
      Object.keys(data).length === 4 &&
      body.trim() === draft.body.trim();
    if (!same) problems.push('frontmatter does not round-trip through parseFrontmatter');
  } catch (err) {
    problems.push(`frontmatter: ${(err as Error).message}`);
  }

  return { ok: problems.length === 0, problems, words };
}
