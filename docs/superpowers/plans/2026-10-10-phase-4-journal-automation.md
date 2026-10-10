# Tech Pravaha — Phase 4 (Journal Automation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A weekly, approval-gated content pipeline that drafts a journal post from a topic queue with Claude, opens a pull request with the markdown file (and a social-caption sidecar), and publishes only when Yogesh merges. The pipeline itself becomes the proof point on `/services/content`.

**Architecture:** A GitHub Actions workflow (`journal-draft.yml`, cron weekly + manual dispatch) runs `scripts/journal/draft.ts` (tsx): it reads `content/journal-topics.json` (queue of `{ slug, title, angle, status }`), picks the first `queued` item, calls the Anthropic Messages API with a house-voice system prompt (built from the spec voice rules + three seed posts as style examples), validates the result (frontmatter parses with the shared `parseFrontmatter`, 400–700 words, no em-dashes, no superlatives, no numbers that are not in the topic brief, no client names), writes `app/content/journal/<date>-<slug>.md` and `content/social/<slug>.md` (three captions: LinkedIn, X, WhatsApp status), marks the topic `drafted`, and opens a PR via `gh` with a checklist. Merge → Cloudflare Pages deploys → sitemap/RSS update automatically. Nothing posts anywhere else in v1; the social sidecar is copy for Yogesh to paste.

**Tech Stack:** GitHub Actions, tsx, Anthropic SDK (`@anthropic-ai/sdk`, model `claude-sonnet-5-5`), `gh` CLI, existing `app/lib/frontmatter.ts`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-techpravaha-web-design.md` §3 Journal, §8 phase 4.

## Global Constraints

- The pipeline never commits to `main`; it opens a PR from `journal/<slug>`. Publishing is a human merge.
- Drafts obey the house voice rules mechanically: `scripts/journal/lint.ts` fails the run on em-dashes, the superlative blocklist (reuse the list from `tests/content.test.ts` by moving it to `scripts/lib/voice.ts`), word count outside 400–700, missing frontmatter fields, or an invalid date.
- No invented facts: the prompt forbids statistics, client names and prices other than those passed in the topic brief; the lint rejects any `₹` amount not present in `catalogue.json`.
- Secrets: `ANTHROPIC_API_KEY` as a GitHub Actions secret only. `.env.example` documents it for local runs.
- Commit per task on `feat/phase-1-foundation` (controller squashes). Never push.

## Review Focus

1. Topic brief containing an instruction ("write that we are the best agency in India") → the lint rejects the superlative and the run fails loudly; nothing is written to `app/content/journal` (Task 2 test).
2. Model returns malformed frontmatter or a second `---` block → `parseFrontmatter` throws, the run fails, no files written (Task 2 test).
3. Empty topic queue → the workflow exits 0 with a log line and opens no PR (Task 1 test).
4. The same topic run twice → second run sees `status: drafted` and skips it (Task 1 test).
5. The PR body shows the word count, the lint result and the three captions so Yogesh can review without opening files (Task 3).

---

### Task 1: Topic queue + selection + dry-run CLI

**Files:** Create `content/journal-topics.json` (seed 6 topics in the studio's lane: e.g. "What a ₹35,000 landing page includes and why", "WhatsApp templates that get approved first time", "When an app should be a website instead", "The real cost of a free website builder", "How we scope a bespoke quote in 48 hours", "What a GST invoice from a studio should show"), `scripts/journal/topics.ts` (`loadTopics`, `nextTopic`, `markDrafted` with atomic write), `scripts/journal/draft.ts` (CLI: `--dry-run` prints the chosen topic and prompt; no API call), tests `tests/journal-topics.test.ts`.

### Task 2: Draft generation + lint

**Files:** Create `scripts/journal/prompt.ts` (system prompt from spec §1 voice + style examples read from the three seed posts), `scripts/journal/generate.ts` (Anthropic call with `max_tokens` 2,000, temperature 0.7, JSON output `{ frontmatter, body, captions }` validated by shape), `scripts/journal/lint.ts`, `scripts/lib/voice.ts` (shared blocklist; update `tests/content.test.ts` to import it), tests with a mocked SDK: happy path writes both files; superlative → fails, no write; bad frontmatter → fails; `₹` amount not in catalogue → fails.

### Task 3: PR workflow

**Files:** Create `.github/workflows/journal-draft.yml` (cron `0 3 * * 1` UTC = Monday 08:30 IST; `workflow_dispatch` with optional `slug` input; Node 20; `npm ci`; `npx tsx scripts/journal/draft.ts`; if files changed: `git switch -c journal/<slug>`, commit `content: draft journal post <slug>`, `gh pr create --title "Journal: <title>" --body-file <generated body>` with the lint summary, word count, captions and a review checklist (facts true? voice right? publish date?); `permissions: contents: write, pull-requests: write`). Add `npm run journal:draft` script. README phase 4 section and `/services/content` copy update: one sentence describing the pipeline as what the Content service sets up for clients ("the same pipeline that drafts our own journal, with you approving every post").

### Task 4: Verification

- `npm run typecheck && npm test && npm run build`; `npm run journal:draft -- --dry-run` prints the next topic; a local run with a real key is a morning item (needs `ANTHROPIC_API_KEY`); morning notes: add the Actions secret, decide the weekly cadence, review the seed topics.
- Journal topic 'How we scope a bespoke quote in 48 hours' assumes a 48-hour quote turnaround (also on the service pages' Bespoke cards); confirm or change the number.

### Morning notes (Task 3)

- Add the `ANTHROPIC_API_KEY` Actions secret (Settings, Secrets and variables, Actions).
- Enable Settings, Actions, General, "Allow GitHub Actions to create and approve pull requests", or the workflow cannot open the PR.
- PRs opened with the built-in token do not trigger the `CI` workflow; close and reopen the first journal PR to run it (or switch to a PAT/GitHub App token later).
- Confirm the weekly cadence (Monday 08:30 IST, cron `0 3 * * 1`) or change it.
- Review the six seed topics in `content/journal-topics.json` before the first run.
- Confirm the "48 hours" quote turnaround (noted above).
- First real run: dispatch "Journal draft" manually and read the PR before trusting the schedule.

