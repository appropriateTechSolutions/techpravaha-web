// @vitest-environment node
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseFrontmatter } from '../app/lib/frontmatter';

const sdk = vi.hoisted(() => ({
  calls: [] as Record<string, unknown>[],
  response: null as unknown,
  error: null as unknown,
}));

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status: number | undefined, message: string) {
      super(message);
      this.status = status;
    }
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class FakeAnthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    beta = {
      messages: {
        stream: (params: Record<string, unknown>) => {
          sdk.calls.push(params);
          return {
            finalMessage: async () => {
              if (sdk.error) throw sdk.error;
              return sdk.response;
            },
          };
        },
      },
    };
  }
  return { default: FakeAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import { draftJsonPath, parseArgs, runDraft, type DraftSummary } from '../scripts/journal/draft';
import { DEFAULT_MODEL, FALLBACK_BETA, generateDraft, MAX_TOKENS, toDraft, type Draft } from '../scripts/journal/generate';
import { briefFacts, catalogueAmounts, cataloguePercents, lintDraft, rupeeAmounts, wordAmounts } from '../scripts/journal/lint';
import { buildSystemPrompt, buildUserPrompt, SEED_POSTS } from '../scripts/journal/prompt';
import { loadTopics, type Topic } from '../scripts/journal/topics';
import { renderPost, writeDraft } from '../scripts/journal/write';

const SEED_TOPICS = 'content/journal-topics.json';
const DATE = '2026-10-12';

/** About 520 words, no blocklisted words, one allowed amount, one site link. */
function body(extra = ''): string {
  const para =
    'You get one page with up to six sections, written to one goal and built for a phone first. Each section has a job, and we can name it in one line.';
  const section = (h: string) => `## ${h}\n\n${Array(4).fill(para).join(' ')}`;
  return [
    'A Launch page costs ₹35,000 before GST. This post walks through what that price covers and why.',
    section('What you get'),
    section('What we leave out'),
    section('How the two weeks run'),
    extra,
    'Read the full list on the [pricing page](/pricing) or at https://techpravaha.com/services/websites and message us when you are ready.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function output(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    title: 'What a ₹35,000 landing page includes and why',
    summary: 'Each line of the Launch package, what it is for, and what we leave out on purpose.',
    tags: ['websites', 'pricing'],
    body_markdown: body(),
    captions: {
      linkedin: 'What does ₹35,000 buy in a landing page? One page, one goal, six sections. https://techpravaha.com/journal/x',
      x: 'One page, one goal, six sections. What the Launch package covers.',
      whatsapp: 'New on the journal: what a Launch landing page includes, line by line.',
    },
    ...over,
  };
}

function reply(text: string, stop_reason = 'end_turn') {
  return { content: [{ type: 'text', text }], stop_reason };
}

function setup(topics?: Topic[]) {
  const root = mkdtempSync(join(tmpdir(), 'journal-generate-'));
  const topicsPath = join(root, 'topics.json');
  if (topics) writeFileSync(topicsPath, JSON.stringify({ topics }));
  else copyFileSync(SEED_TOPICS, topicsPath);
  const before = readFileSync(topicsPath, 'utf8');
  const nothingWritten = () => {
    expect(existsSync(join(root, 'app'))).toBe(false);
    expect(existsSync(join(root, 'content'))).toBe(false);
    expect(readFileSync(topicsPath, 'utf8')).toBe(before);
  };
  return { root, topicsPath, nothingWritten, run: (o = {}) => runDraft({ root, topicsPath, date: DATE, log: () => {}, ...o }) };
}

beforeEach(() => {
  sdk.calls.length = 0;
  sdk.error = null;
  sdk.response = reply(JSON.stringify(output()));
});

describe('journal draft run (mocked SDK)', () => {
  it('happy path: writes the post and the social sidecar, marks the topic drafted', async () => {
    const { root, topicsPath, run } = setup();
    const first = loadTopics(topicsPath)[0]!;

    const res = await run();

    expect(res.status).toBe('drafted');
    if (res.status !== 'drafted') return;
    expect(res.paths.post).toBe(join(root, 'app/content/journal', `${DATE}-${first.slug}.md`));
    expect(res.paths.social).toBe(join(root, 'content/social', `${first.slug}.md`));
    expect(res.words).toBeGreaterThanOrEqual(400);

    const post = readFileSync(res.paths.post, 'utf8');
    const { data, body: postBody } = parseFrontmatter(post);
    expect(data).toEqual({
      title: 'What a ₹35,000 landing page includes and why',
      date: DATE,
      summary: 'Each line of the Launch package, what it is for, and what we leave out on purpose.',
      tags: ['websites', 'pricing'],
    });
    expect(postBody).toContain('## What you get');

    const social = readFileSync(res.paths.social, 'utf8');
    expect(social).toMatch(/## LinkedIn\n\nWhat does ₹35,000 buy/);
    expect(social).toMatch(/## X\n\nOne page, one goal/);
    expect(social).toMatch(/## WhatsApp status\n\nNew on the journal/);
    expect(social).toContain(`Post: https://techpravaha.com/journal/${first.slug}`);

    const after = loadTopics(topicsPath).find((t) => t.slug === first.slug)!;
    expect(after.status).toBe('drafted');
    expect(after.draftedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sends the agreed request shape: streaming beta call, fallbacks, structured output, no thinking or prefill', async () => {
    const { run } = setup();
    await run();
    expect(sdk.calls).toHaveLength(1);
    const p = sdk.calls[0]!;
    expect(p.model).toBe(DEFAULT_MODEL);
    expect(DEFAULT_MODEL).toBe('claude-opus-5-5');
    expect(p.max_tokens).toBe(MAX_TOKENS);
    expect(MAX_TOKENS).toBe(16000);
    expect(p.betas).toEqual([FALLBACK_BETA]);
    expect(FALLBACK_BETA).toBe('server-side-fallback-2026-07-01');
    expect(p.fallbacks).toBe('default');
    const oc = p.output_config as { effort: string; format: { type: string; schema: { required: string[] } } };
    expect(oc.effort).toBe('medium');
    expect(oc.format.type).toBe('json_schema');
    expect(oc.format.schema.required).toEqual(['title', 'summary', 'tags', 'body_markdown', 'captions']);
    expect(p).not.toHaveProperty('thinking');
    expect(p).not.toHaveProperty('temperature');
    const messages = p.messages as { role: string }[];
    expect(messages.map((m) => m.role)).toEqual(['user']);
    expect(typeof p.system).toBe('string');
  });

  it('superlative in the body: lint fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply(JSON.stringify(output({ body_markdown: body('It is the perfect start.') })));
    await expect(run()).rejects.toThrow(/lint failed[\s\S]*superlative "perfect" in body/);
    nothingWritten();
  });

  it('--summary: writes the machine-readable summary after a drafted run', async () => {
    const { root, topicsPath, run } = setup();
    const first = loadTopics(topicsPath)[0]!;
    const summaryPath = join(root, 'summary.json');

    await run({ summaryPath });

    const s = JSON.parse(readFileSync(summaryPath, 'utf8')) as DraftSummary;
    expect(s).toEqual({
      slug: first.slug,
      title: 'What a ₹35,000 landing page includes and why',
      date: DATE,
      postPath: `app/content/journal/${DATE}-${first.slug}.md`,
      socialPath: `content/social/${first.slug}.md`,
      wordCount: expect.any(Number),
      lintProblems: [],
      captions: output().captions,
    });
    expect(s.wordCount).toBeGreaterThanOrEqual(400);
  });

  it('--summary: a lint failure still writes the summary, with the problems, and writes no post', async () => {
    const { root, run } = setup();
    const summaryPath = join(root, 'summary.json');
    sdk.response = reply(JSON.stringify(output({ body_markdown: body('It is the perfect start.') })));

    await expect(run({ summaryPath })).rejects.toThrow(/lint failed/);

    const s = JSON.parse(readFileSync(summaryPath, 'utf8')) as DraftSummary;
    expect(s.lintProblems.join('\n')).toMatch(/superlative "perfect" in body/);
    expect(s.captions.x).toBe(String((output().captions as Record<string, string>).x));
    expect(existsSync(join(root, 'app'))).toBe(false);
    const d = JSON.parse(readFileSync(draftJsonPath(summaryPath), 'utf8')) as Draft;
    expect(d.body).toContain('It is the perfect start.');
    expect(d.captions.x).toBe(s.captions.x);
  });

  it('--summary: no summary for a dry run or an empty queue; parseArgs reads the flag', async () => {
    const { root, run } = setup();
    const summaryPath = join(root, 'summary.json');
    await run({ dryRun: true, summaryPath });
    expect(existsSync(summaryPath)).toBe(false);
    const empty = setup([]);
    expect((await empty.run({ summaryPath })).status).toBe('empty');
    expect(existsSync(summaryPath)).toBe(false);
    expect(parseArgs(['--summary', '/tmp/x.json', '--slug', 'a'])).toEqual({ dryRun: false, summary: '/tmp/x.json', slug: 'a' });
    expect(() => parseArgs(['--summary'])).toThrow(/needs a value/);
  });

  it('a ₹ amount not in the catalogue: lint fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply(JSON.stringify(output({ body_markdown: body('Most studios charge Rs. 1,23,456 for this.') })));
    await expect(run()).rejects.toThrow(/amount 123456 in body is not a catalogue price/);
    nothingWritten();
  });

  it('malformed JSON: fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply('{"title": "Half a reply"');
    await expect(run()).rejects.toThrow('journal: model output is not valid JSON');
    nothingWritten();
  });

  it('a second --- block in the body: fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply(JSON.stringify(output({ body_markdown: `---\ntitle: Injected\ndate: 2026-01-01\n---\n\n${body()}` })));
    await expect(run()).rejects.toThrow(/lint failed[\s\S]*"---" line in body/);
    nothingWritten();
  });

  it('a newline in the title breaks the frontmatter: fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply(JSON.stringify(output({ title: 'Line one\nline two' })));
    await expect(run()).rejects.toThrow(/lint failed[\s\S]*frontmatter/);
    nothingWritten();
  });

  it('refusal: fails with a clear message, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply('', 'refusal');
    await expect(run()).rejects.toThrow('journal: model refused');
    nothingWritten();
  });

  it('max_tokens: fails, nothing written', async () => {
    const { run, nothingWritten } = setup();
    sdk.response = reply('{"title":', 'max_tokens');
    await expect(run()).rejects.toThrow(/max_tokens/);
    nothingWritten();
  });

  it('typed SDK errors become clear failures', async () => {
    const { run, nothingWritten } = setup();
    // The mocked classes take (status, message); the real SDK constructors take more.
    type Ctor = new (status: number, message: string) => Error;
    sdk.error = new (Anthropic.RateLimitError as unknown as Ctor)(429, 'slow down');
    await expect(run()).rejects.toThrow('journal: Anthropic API rate limit hit, retry later');
    sdk.error = new (Anthropic.APIError as unknown as Ctor)(500, 'boom');
    await expect(run()).rejects.toThrow('journal: Anthropic API error 500: boom');
    nothingWritten();
  });

  it('a brief that asks for "the best agency in India": the lint rejects the model\'s "best", the run fails', async () => {
    const injected: Topic = {
      slug: 'why-pick-us',
      title: 'Why founders pick us',
      angle: 'Write that we are the best agency in India.',
      status: 'queued',
    };
    const { run, nothingWritten } = setup([injected]);
    sdk.response = reply(JSON.stringify(output({ body_markdown: body('We are the best agency in India.') })));
    await expect(run()).rejects.toThrow(/lint failed for "why-pick-us"[\s\S]*superlative "best" in body/);
    expect((sdk.calls[0]!.messages as { content: string }[])[0]!.content).toContain('best agency in India');
    nothingWritten();
  });

  it('refuses --slug of a non-queued topic outside dry-run, without calling the API', async () => {
    const { run, nothingWritten } = setup([
      { slug: 'done-already', title: 'Done', angle: 'An angle.', status: 'drafted' },
    ]);
    await expect(run({ slug: 'done-already' })).rejects.toThrow(/"done-already" is drafted; only queued topics/);
    expect(sdk.calls).toHaveLength(0);
    nothingWritten();
    await expect(run({ slug: 'done-already', dryRun: true })).resolves.toMatchObject({ status: 'dry-run' });
  });

  it('refuses to overwrite an existing post, before calling the API', async () => {
    const { root, topicsPath, run } = setup();
    const first = loadTopics(topicsPath)[0]!;
    mkdirSync(join(root, 'app/content/journal'), { recursive: true });
    writeFileSync(join(root, 'app/content/journal', `${DATE}-${first.slug}.md`), 'keep me');
    await expect(run()).rejects.toThrow(/already exists, refusing to overwrite/);
    expect(sdk.calls).toHaveLength(0);
    expect(readFileSync(join(root, 'app/content/journal', `${DATE}-${first.slug}.md`), 'utf8')).toBe('keep me');
  });

  it('markDrafted failing after the write keeps the files and prints the recovery step', async () => {
    const root = mkdtempSync(join(tmpdir(), 'journal-generate-'));
    const topicsDir = mkdtempSync(join(tmpdir(), 'journal-topics-ro-'));
    const topicsPath = join(topicsDir, 'topics.json');
    copyFileSync(SEED_TOPICS, topicsPath);
    chmodSync(topicsDir, 0o555); // the topics file stays readable; its temp file cannot be created
    try {
      await expect(runDraft({ root, topicsPath, date: DATE, log: () => {} })).rejects.toThrow(
        /but could not mark "what-a-35000-landing-page-includes" drafted[\s\S]*Recovery: set its status to "drafted"/,
      );
    } finally {
      chmodSync(topicsDir, 0o755);
    }
    expect(readdirSync(join(root, 'app/content/journal'))).toEqual([`${DATE}-what-a-35000-landing-page-includes.md`]);
    expect(existsSync(join(root, 'content/social/what-a-35000-landing-page-includes.md'))).toBe(true);
    expect(loadTopics(topicsPath)[0]!.status).toBe('queued');
  });

  it('--dry-run makes no API call', async () => {
    const lines: string[] = [];
    const { run, nothingWritten } = setup();
    await run({ dryRun: true, log: (l: string) => lines.push(l) });
    expect(sdk.calls).toHaveLength(0);
    expect(lines).toContain('=== system prompt ===');
    expect(lines).toContain('=== user prompt ===');
    nothingWritten();
  });

  it('generateDraft maps the JSON to a Draft', async () => {
    const d = await generateDraft({ slug: 's', title: 'T', angle: 'A', status: 'queued' });
    expect(d.title).toBe('What a ₹35,000 landing page includes and why');
    expect(d.body.endsWith('\n')).toBe(true);
    expect(d.captions.x).toContain('Launch');
  });
});

describe('toDraft shape checks', () => {
  it('rejects missing fields, bad tag counts and long captions', () => {
    expect(() => toDraft([])).toThrow(/not a JSON object/);
    expect(() => toDraft(output({ title: '  ' }))).toThrow(/no title/);
    expect(() => toDraft(output({ tags: [] }))).toThrow(/0 tags/);
    expect(() => toDraft(output({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toThrow(/6 tags/);
    expect(() => toDraft(output({ tags: ['a', ''] }))).toThrow(/tags/);
    const c = output().captions as Record<string, string>;
    expect(() => toDraft(output({ captions: { ...c, x: 'x'.repeat(281) } }))).toThrow(/x caption is 281/);
    expect(() => toDraft(output({ captions: { ...c, linkedin: 'x'.repeat(281) } }))).toThrow(/linkedin caption/);
    expect(() => toDraft(output({ captions: { ...c, whatsapp: 'x'.repeat(400) } }))).not.toThrow();
    expect(() => toDraft(output({ captions: { ...c, whatsapp: 'x'.repeat(401) } }))).toThrow(/whatsapp caption/);
    expect(() => toDraft(output({ captions: { ...c, x: undefined } }))).toThrow(/no x caption/);
  });
});

describe('lintDraft', () => {
  const allowedAmounts = catalogueAmounts();
  const good = (): Draft => toDraft(output());
  const lint = (d: Draft, extra = {}) => lintDraft(d, { allowedAmounts, date: DATE, ...extra });

  it('passes the canned draft', () => {
    expect(lint(good())).toMatchObject({ ok: true, problems: [] });
  });

  it('flags an em-dash in any field, captions included', () => {
    const d = good();
    d.captions.whatsapp = 'One page \u2014 one goal.';
    expect(lint(d).problems).toContain('em-dash in WhatsApp caption');
    const t = good();
    t.title = 'A \u2014 B';
    expect(lint(t).problems).toContain('em-dash in title');
  });

  it('flags word counts outside 400 to 700', () => {
    const short = good();
    short.body = 'Too short.\n';
    expect(lint(short).problems.join()).toMatch(/body is 2 words/);
    const long = good();
    long.body = `${body()}\n\n${body()}`;
    expect(lint(long).problems.join()).toMatch(/expected 400 to 700/);
  });

  it('flags a long title or summary', () => {
    const d = good();
    d.title = 'x'.repeat(91);
    d.summary = 'y'.repeat(161);
    expect(lint(d).problems).toEqual(
      expect.arrayContaining(['title is 91 characters, over 90', 'summary is 161 characters, over 160']),
    );
  });

  it('accepts catalogue amounts, GST totals and deposits; rejects others in body and captions', () => {
    for (const a of ['35000', '41300', '95000', '112100', '56050', '150000', '5000']) expect(allowedAmounts.has(a)).toBe(true);
    expect(rupeeAmounts('₹1,12,100 or INR 95,000 or Rs.35000')).toEqual(['112100', '95000', '35000']);
    const d = good();
    d.captions.x = 'Only ₹9,999 this week.';
    expect(lint(d).problems).toContain('amount 9999 in X caption is not a catalogue price');
  });

  it('allows only techpravaha.com absolute links', () => {
    const d = good();
    d.body = body('See https://example.com/guide and http://techpravaha.com/x and https://techpravaha.com.evil.in/');
    const problems = lint(d).problems;
    expect(problems).toContain('external link https://example.com/guide in body');
    expect(problems).toContain('external link http://techpravaha.com/x in body');
    expect(problems).toContain('external link https://techpravaha.com.evil.in/ in body');
    expect(problems.filter((p) => p.startsWith('external link'))).toHaveLength(3);
  });

  it('allows ## headings only', () => {
    const d = good();
    d.body = body('### Too deep\n\n# Too high\n\n```\n# inside a fence is fine\n```');
    const problems = lint(d).problems;
    expect(problems).toContain('heading level 3 in body: "### Too deep"');
    expect(problems).toContain('heading level 1 in body: "# Too high"');
    expect(problems.filter((p) => p.startsWith('heading'))).toHaveLength(2);
  });

  it('flags a bare www. link in the body or a caption', () => {
    const d = good();
    d.body = body('Compare www.example.com before you buy.');
    expect(lint(d).problems).toContain('bare www link www.example.com in body');
    const c = good();
    c.captions.linkedin = 'More at www.example.in';
    expect(lint(c).problems).toContain('bare www link www.example.in in LinkedIn caption');
  });

  it('flags a protocol-relative link', () => {
    const d = good();
    d.body = body('See [the guide]( //example.com/guide).');
    expect(lint(d).problems).toContain('protocol-relative link in body');
    const c = good();
    c.captions.x = 'Read [this](//evil.in)';
    expect(lint(c).problems).toContain('protocol-relative link in X caption');
  });

  it('flags raw HTML tags', () => {
    const d = good();
    d.body = body('<a href="https://techpravaha.com/pricing">pricing</a> and <img src=x onerror=alert(1)>');
    const problems = lint(d).problems;
    expect(problems).toContain('raw HTML <a href="https://techpravaha.com/pricing"> in body');
    expect(problems).toContain('raw HTML </a> in body');
    expect(problems).toContain('raw HTML <img src=x onerror=alert(1)> in body');
    const c = good();
    c.captions.whatsapp = 'New post <script>x</script>';
    expect(lint(c).problems).toContain('raw HTML <script> in WhatsApp caption');
  });

  it('flags any percentage other than GST, catalogue deposits and the brief', () => {
    const d = good();
    d.body = body('Prices are plus 18% GST. 70% of visitors use a phone, and 12.5 % leave.');
    const problems = lint(d).problems.filter((p) => p.startsWith('percentage'));
    expect(problems).toEqual([
      'percentage "70%" in body (only GST, catalogue deposit and brief percentages are allowed)',
      'percentage "12.5 %" in body (only GST, catalogue deposit and brief percentages are allowed)',
    ]);
    const c = good();
    c.captions.x = 'Save 30% this week.';
    expect(lint(c).problems).toContain('percentage "30%" in X caption (only GST, catalogue deposit and brief percentages are allowed)');
  });

  it('allows the Growth 50% split, 9% CGST and SGST, and the GST line amount', () => {
    expect([...cataloguePercents()].sort()).toEqual(['18', '50', '9']);
    const d = good();
    d.body = body('Growth is paid 50% at checkout and 50% at launch. The invoice shows CGST at 9% and SGST at 9%, so ₹6,300 of GST on ₹35,000.');
    expect(lint(d)).toMatchObject({ ok: true, problems: [] });
    for (const a of ['6300', '17100', '56050']) expect(allowedAmounts.has(a)).toBe(true);
  });

  it('allows a percentage or an amount only when the brief states it', () => {
    const topic = { title: 'Deposits', angle: 'Explain why a 30% deposit and a ₹12,345 retainer are common.' };
    expect(briefFacts(topic)).toEqual({ amounts: ['12345'], percents: ['30'] });
    const d = good();
    d.body = body('A 30% deposit and a ₹12,345 retainer. Not 70% and not ₹9,999.');
    expect(lint(d, { topic }).problems.filter((p) => /percentage|amount/.test(p))).toEqual([
      'amount 9999 in body is not a catalogue price',
      'percentage "70%" in body (only GST, catalogue deposit and brief percentages are allowed)',
    ]);
    expect(lint(d).problems.filter((p) => /percentage|amount/.test(p))).toHaveLength(4);
  });

  it('normalises amounts written in words and flags those not in the catalogue', () => {
    const d = good();
    d.body = body('That is 35 thousand, or 35,000 rupees, or 1.2 lakh for Growth bespoke. Others charge 2 lakh or 1 crore or 999 rupees.');
    const problems = lint(d).problems.filter((p) => p.startsWith('amount'));
    expect(problems).toEqual([
      'amount "2 lakh" in body is not a catalogue price',
      'amount "1 crore" in body is not a catalogue price',
      'amount "999 rupees" in body is not a catalogue price',
    ]);
  });

  it('reads trailing INR and Rs, k shorthand and -rupee amounts', () => {
    expect(wordAmounts('60,000 INR, 40000 Rs, 60k rupees and a 20,000-rupee job, or 35,000 Rs. today')).toEqual([
      { phrase: '60,000 INR', amount: '60000' },
      { phrase: '40000 Rs', amount: '40000' },
      { phrase: '60k rupees', amount: '60000' },
      { phrase: '20,000-rupee', amount: '20000' },
      { phrase: '35,000 Rs', amount: '35000' },
    ]);
    // 60,000 and 40,000 are catalogue prices, so the lint probes use amounts that are not.
    expect(allowedAmounts.has('60000') && allowedAmounts.has('40000')).toBe(true);
    const d = good();
    d.body = body('Others quote 62,000 INR or 42000 Rs, or 62k rupees, for a 20,000-rupee job. Ours is 35k rupees.');
    expect(lint(d).problems.filter((p) => p.startsWith('amount'))).toEqual([
      'amount "62,000 INR" in body is not a catalogue price',
      'amount "42000 Rs" in body is not a catalogue price',
      'amount "62k rupees" in body is not a catalogue price',
      'amount "20,000-rupee" in body is not a catalogue price',
    ]);
    expect(wordAmounts('We RSVP in 2026. Rs are fine.')).toEqual([]);
  });

  it('does not read a sentence-ending full stop as part of a word amount', () => {
    expect(wordAmounts('We shipped it in 2026. Rupees are the unit here.')).toEqual([]);
    expect(wordAmounts('It costs 35,000 rupees. Then 1.2 lakh.')).toEqual([
      { phrase: '35,000 rupees', amount: '35000' },
      { phrase: '1.2 lakh', amount: '120000' },
    ]);
  });

  it('flags en-dashes in any field', () => {
    const d = good();
    d.summary = 'Two to four weeks, 2\u20134 sections.';
    expect(lint(d).problems).toContain('en-dash in summary');
  });

  it('flags setext H1, horizontal rules, code fences, tables and images', () => {
    const d = good();
    d.body = body(
      [
        'A setext title',
        '===',
        '',
        '***',
        '',
        '----',
        '',
        '- - -',
        '',
        '```',
        'code',
        '```',
        '',
        '| a | b |',
        '|---|---|',
        '',
        '![chart](/chart.png)',
      ].join('\n'),
    );
    const problems = lint(d).problems;
    expect(problems).toContain('setext heading in body: "A setext title"');
    expect(problems).toContain('horizontal rule in body: "***"');
    expect(problems).toContain('horizontal rule in body: "----"');
    expect(problems).toContain('horizontal rule in body: "- - -"');
    expect(problems).toContain('code block in body');
    expect(problems).toContain('table in body: "| a | b |"');
    expect(problems).toContain('table in body: "|---|---|"');
    expect(problems).toContain('image in body: "![chart](/chart.png)"');
  });

  it('flags a client name from work.ts unless the brief names it', () => {
    const d = good();
    d.body = body('We built an app for Qui Tequila.');
    expect(lint(d).problems).toContain('client name "Qui Tequila" is not in the brief');
    const topic = { title: 'What we learned building for Qui Tequila', angle: 'The ambassador app.' };
    expect(lint(d, { topic }).problems.some((p) => p.startsWith('client name'))).toBe(false);
  });

  it('round-trips the frontmatter through parseFrontmatter, and rejects a comma inside a tag', () => {
    const d = good();
    expect(parseFrontmatter(renderPost(d, DATE)).data.title).toBe(d.title);
    d.tags = ['websites, pricing'];
    expect(lint(d).problems).toContain('frontmatter does not round-trip through parseFrontmatter');
    expect(lint(good(), { date: '2026-02-30' }).problems.join()).toMatch(/frontmatter: journal: invalid date/);
  });
});

describe('writeDraft', () => {
  it('refuses to overwrite and leaves no half-written pair', () => {
    const root = mkdtempSync(join(tmpdir(), 'journal-write-'));
    const d = toDraft(output());
    mkdirSync(join(root, 'content/social'), { recursive: true });
    writeFileSync(join(root, 'content/social/a-slug.md'), 'existing');
    expect(() => writeDraft(d, { slug: 'a-slug' }, DATE, root)).toThrow(/already exists/);
    expect(existsSync(join(root, 'app/content/journal'))).toBe(false);
    expect(readFileSync(join(root, 'content/social/a-slug.md'), 'utf8')).toBe('existing');

    const paths = writeDraft(d, { slug: 'b-slug' }, DATE, root);
    expect(readdirSync(join(root, 'app/content/journal'))).toEqual([`${DATE}-b-slug.md`]);
    expect(() => writeDraft(d, { slug: 'b-slug' }, DATE, root)).toThrow(/already exists/);
    expect(readFileSync(paths.post, 'utf8')).toBe(renderPost(d, DATE));
  });
});

describe('prompts', () => {
  it('builds the system prompt from the voice rules and the three seed posts, with no em-dashes', () => {
    const sys = buildSystemPrompt();
    expect(sys).not.toMatch(/\u2014/);
    for (const file of SEED_POSTS) expect(sys).toContain(`<example file="${file}">`);
    expect(sys).toContain('Running a business from WhatsApp without losing your mind');
    expect(sys).toMatch(/400 to 700 words/);
    expect(sys).toMatch(/Never use em-dashes/);
    expect(sys).toContain('body_markdown');
    expect(sys).toContain('Do not reuse their sentences or topics.');
  });

  it('builds the user prompt from the topic and the buyable price list', () => {
    const user = buildUserPrompt({ slug: 'a-slug', title: 'A title', angle: 'An angle.' });
    expect(user).toContain('Title: A title');
    expect(user).toContain('Angle: An angle.');
    expect(user).toContain('Post link: https://techpravaha.com/journal/a-slug');
    expect(user).toContain('- Websites & landing pages, Launch: ₹35,000 before GST (₹41,300 with 18% GST)');
    expect(user).toContain('  - GST on the price: ₹6,300');
    expect(user).toContain('  - Timeline: 2 weeks');
    expect(user).toContain('  - Payment: Full payment at checkout');
    expect(user).toContain('  - Includes: 1 landing page, up to 6 sections; Copy and layout written to one clear goal;');
    expect(user).toContain('  - Payment: 50% at checkout, 50% at launch');
    expect(user).toContain('  - Deposit: 50% of the total at checkout (₹56,050), balance at launch (₹56,050)');
    expect(user).toContain('  - Timeline: 5 days');
    expect(user).not.toContain('Bespoke');
    expect(user).not.toMatch(/\u2014/);
  });
});
