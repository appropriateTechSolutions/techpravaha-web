# Morning notes

Everything that needs Yogesh, in one place. Each line is one item; the file to edit follows where there is one. The per-phase originals stay at the end of each plan in `docs/superpowers/plans/` (phase 1 through 4). Without any of this the site and the Worker still run: chat answers with the outage reply, lab apps that use a model show their offline state, checkout shows "Online payment is not switched on yet.", and the journal workflow fails every Monday until the `ANTHROPIC_API_KEY` Actions secret is set.

## Start here

Merging to `main` arms two workflows: the Monday journal cron (03:17 UTC) and `deploy-worker.yml` on the merge push. Do these in order.

1. [ ] The phase 4 final-review fix round has landed on `feat/phase-1-foundation` (one commit after `33ab9dc`).
2. [ ] GitHub Actions: add the repo secret `ANTHROPIC_API_KEY` (from a spend-capped workspace) and tick Settings, Actions, General, "Allow GitHub Actions to create and approve pull requests". Or, if you are not ready, disable the "Journal draft" workflow (Actions tab, Journal draft, the "..." menu, Disable workflow) so the cron does not run.
3. [ ] Push the branch, open the PR to `main`, review and merge. Expect `Deploy Worker` to go red on the merge push until the KV ids and the Cloudflare secrets exist (go-live step 4 below).
4. [ ] Branch protection on `main`: require a pull request before merging and require the `CI` check.
5. [ ] Dispatch "Journal draft" once by hand (Actions tab, Run workflow) and read the PR. The run dispatches `CI` on the PR's branch itself (see the CI note under GitHub Actions); if no `CI` check shows on the PR, close and reopen it.
6. [ ] Then the commerce go-live order below, then the Gemini, Anthropic (Worker) and Telegram notes, then the content decisions and placeholders, then the README cutover checklist.

## Accounts and secrets

Worker secrets are set with `npx wrangler secret put <NAME>` on Node 22 (details in README "Phase 2" and "Phase 3").

### Razorpay
- [ ] Create the account and finish KYC; copy the test keys. See `docs/ops/razorpay-setup.md`.
- [ ] `wrangler secret put RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` with the test values first.
- [ ] Add the test webhook (`payment.captured`, its own secret), auto-capture on, and `techpravaha.com` in the account's registered websites.
- [ ] If the account is shared with ATS, expect a "Payment for unknown order" alert for every ATS payment (webhooks are account-wide).
- [ ] Set the test `VITE_RAZORPAY_KEY_ID` in the Cloudflare Pages Preview environment only; the live key goes in Production after KYC.
- [ ] Set `VITE_API_URL` in Pages too if the Worker is not on `https://api.techpravaha.com`.

### Resend
- [ ] Verify the domain `techpravaha.com` in Resend.
- [ ] Create the sending key and `wrangler secret put RESEND_API_KEY`.
- [ ] Decide `BOOKING_URL` (a Google Calendar appointment schedule): `workers/techpravaha-api/wrangler.toml` for the receipt email, `VITE_BOOKING_URL` in Pages for the site. Unset, every "Book a call" button reads "Talk to us" and links to /contact.

### Apps Script (Google Sheets)
- [ ] Deploy `scripts/google-apps-script-orders.js` against a new "TP Orders" sheet (17 columns, including "Deposit" and "Balance due at launch"); copy the `/exec` URL and the token.
- [ ] Set `SHEETS_WEBHOOK_URL` and `SHEETS_WEBHOOK_TOKEN` on the Worker (see README Phase 2 for which are secrets and which are vars).
- [ ] Leads need no separate script or site env var: the same orders script routes `type: "lead"` rows to a "Leads" tab (created on the first lead) through the Worker's `SHEETS_WEBHOOK_URL`. Re-deploy the script after any edit.
- [ ] Publish the new Apps Script version before deploying the Worker, so `type: "lead"` rows reach the Leads tab and not the Orders tab.
- [ ] Set `VITE_WHATSAPP_NUMBER`, `VITE_GA_ID` and `VITE_CLARITY_ID` in Pages (`.env.example` lists them).
- [ ] Keep Microsoft Clarity masking on Balanced or Strict, or the privacy line about form input stops being true.

### Cloudflare (KV, secrets, Worker deploy)
- [ ] Create the KV namespace `techpravaha-orders` (binding `ORDERS`; `id` and `preview_id`) and paste the ids into `workers/techpravaha-api/wrangler.toml`.
- [ ] Put the Worker secrets in with the test keys (six in phase 2), turn on Workers Logs, then `npm run worker:deploy` on Node 22.
- [ ] Route `api.techpravaha.com/*` to the Worker; add the WAF rate limit on `POST /orders`.
- [ ] Confirm the Workers plan: Free allows 1,000 KV writes a day across the account and every order writes 2 to 3 keys.
- [ ] Rate limits (`/chat` 12, `/leads` 6, `/lab/complete` 30 per IP per minute) are bindings in `wrangler.toml`; no setup, counts are per location and approximate.
- [ ] Price edits: edit `catalogue.json` and merge; `deploy-worker.yml` regenerates the chat facts and redeploys once the Cloudflare secrets are set (GitHub Actions below); until then run `npm run worker:deploy` on Node 22 after every price edit, or checkout refuses that tier. Adding or removing a tier or service needs `npm run prompt:data` in the same PR.

### Gemini (chat)
- [ ] Use a billed Gemini project (on an unbilled AI Studio project Google may use chat content to improve its products); create the key there.
- [ ] Set a spend cap on that project before go-live. This is a prerequisite; a budget alert only notifies and does not stop spend.
- [ ] `wrangler secret put GEMINI_API_KEY`; leave `GEMINI_MODEL` unset (default `gemini-3.5-flash-lite`).
- [ ] Confirm the model answers on your key with the one-request curl in README "Gemini key" (a JSON body with `candidates`; 403 or 404 means the key cannot reach it).

### Anthropic (lab apps and journal drafts)
- [ ] Create the key in a workspace with a monthly spend cap; `wrangler secret put ANTHROPIC_API_KEY`. Leave `LAB_MODEL` unset (default `claude-haiku-5-5`; Opus and Sonnet 5.x reject the disabled-thinking parameter).
- [ ] First real journal draft: prefer the manual dispatch (Start here, step 5). A local run (`ANTHROPIC_API_KEY=... npm run journal:draft`, see `.env.example`) writes the post and the sidecar and flips the topic to `drafted` in your working tree; read the post, then discard all three: `git checkout -- content/journal-topics.json && rm app/content/journal/*-<slug>.md content/social/<slug>.md`.

### Telegram
- [ ] `@BotFather`, `/newbot`, then `wrangler secret put TELEGRAM_BOT_TOKEN`.
- [ ] Message the bot, read `message.chat.id` from `https://api.telegram.org/bot<token>/getUpdates`, set `TELEGRAM_CHAT_ID` in `workers/techpravaha-api/wrangler.toml` `[vars]`. Until both are set, order pings arrive by email to `ALERT_EMAIL` and lead pings are skipped; the Leads tab is the record.

### GitHub Actions
- [ ] Repo secret `ANTHROPIC_API_KEY` (Settings, Secrets and variables, Actions) for `journal-draft.yml`; a spend cap on that workspace applies here too.
- [ ] Repo secrets `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID` for `deploy-worker.yml`; do the first deploy by hand once the KV ids are in `wrangler.toml`, or the workflow fails.
- [ ] Settings, Actions, General: tick "Allow GitHub Actions to create and approve pull requests", or the journal workflow cannot open its PR.
- [ ] Branch protection on `main` once the repo is pushed: require a pull request before merging and make the `CI` workflow a required check.
- [ ] CI token note: a PR opened with the built-in token does not trigger `CI`, and that applies to every journal PR, not only the first. The journal workflow therefore runs `gh workflow run ci.yml --ref journal/<slug>` after opening each PR (`ci.yml` now accepts `workflow_dispatch`, and a dispatch made with the built-in token does start a workflow). Confirm on the first journal PR that this run shows as the required `CI` check; if it does not, close and reopen each journal PR to run `CI`, or switch to a PAT or GitHub App token.
- [ ] Confirm the weekly cadence (Monday 08:47 IST, cron `17 3 * * 1`) in `.github/workflows/journal-draft.yml`, or change it.
- [ ] First real run: dispatch "Journal draft" by hand and read the PR before trusting the schedule.

## Content decisions

- [ ] Testimonials: supply real entries (Upwork profile URL or pasted feedback) in `app/content/testimonials.ts`; the file ships empty on purpose. Confirm or change the "Clients · In their words." heading in `app/components/Testimonials.tsx`.
- [ ] Screenshots: replace the placeholder SVGs `public/work/<slug>/1.svg` and `2.svg` for exhibition-app, qui-ambassador-app, home-manager and intpro; update `images` in `app/content/work.ts` if the extension changes.
- [ ] Work timelines: all four items read "[timeline pending]"; supply build durations in `app/content/work.ts`.
- [ ] Work facts: check Qui Ambassador App's "shipped" list against what is live and remove the rest (`app/content/work.ts`); `services` tags and each service's `related` list are in `app/content/{work,services}.ts`.
- [ ] Client names: confirm the exhibition organiser's name and whether it may be shown (`app/content/work.ts`, currently "Trade exhibition organiser, India"); IntPro and Home Manager read "Studio product", confirm or name the client.
- [ ] Lab store links: Tab Tamer, LocaleLens, Should I Buy This?, AfterBuy, GoodFind and HomeFind are `href: '#'` ("source on request"); add Chrome Web Store or hosted URLs in `app/content/lab.ts`.
- [ ] Legal placeholders: `[GSTIN]` and `[registered address]` in `app/components/LegalPage.tsx` (shown on /terms); add the address and a phone number to /contact for Razorpay's checklist.
- [ ] Legal placeholder: jurisdiction `[city]` for disputes in `app/components/LegalPage.tsx` (usually the city of the registered address).
- [ ] Refund formula in /refunds (package price divided by days in the timeline, times calendar days from kickoff to cancellation, capped at the price; no refund after launch): confirm calendar days vs working days. Design Audit is "5 days" in `catalogue.json`; is that calendar or working days? Also ask the CA to confirm the tax handling /refunds promises: we refund the refunded amount plus the GST charged on it, send a credit note, and no refund is due after launch.
- [ ] Clause confirmations, confirm or cut in `app/components/LegalPage.tsx`: timeline moves day-for-day while we wait on the client (Terms 5); client owns content rights and post-handover passwords (Terms 8); liability capped at the package price (Terms 11); try to settle before court (Terms 12); phased quotes pro-rate the phase in progress (Refunds 5); Care add-on invoiced monthly (Terms 4); third-party fees passed on at cost (Terms 3); terms in force on the day you paid apply (Terms 13).
- [ ] Terms 9: accounts are in your name from day one and ownership transfers on full payment; confirm. The AI and WhatsApp FAQs say model, telephony and Meta business accounts are in the client's name; confirm.
- [ ] Privacy: confirm the email provider and whether to name a grievance contact (IT Rules 2011, DPDP); Razorpay may ask for a "Shipping and delivery" page (Terms 2 covers it; add a `/delivery` route if they insist).
- [ ] Revisions policy: two rounds on every tier (`app/content/services.ts`); confirm.
- [ ] Growth `depositPct`: the four buyable Growth tiers carry `"depositPct": 50` in `catalogue.json`; keep it, or set 100 and change the "50% at checkout, 50% at launch" copy (catalogue `payment` lines, Terms, Refunds, the pricing FAQ, the service FAQs) in the same commit.
- [ ] "48 hours": the journal topic "How we scope a bespoke quote in 48 hours" in `content/journal-topics.json` assumes a 48-hour quote turnaround; confirm or change the number (a search of `app/` and `catalogue.json` found the figure nowhere else).
- [ ] Journal seed topics: review the six topics in `content/journal-topics.json` before the first run. Also confirm the post "Why we put prices on the website" (overruns inside a fixed scope are ours to absorb) in `app/content/journal/2026-10-10-why-fixed-prices.md`.
- [ ] Teardown delivery template: every `lead_magnet` row in the Leads tab needs a reply within two working days; write the reply template (ten points in `app/content/teardown.ts`) and decide who covers it when you are away.
- [ ] Contact page promise: "reply within one working day" in `app/routes/contact.tsx` (copy and meta description), `app/components/ContactForm.tsx` and `app/routes/thanks.tsx`; keep or change. The WhatsApp FAQ says Meta's per-message charges are not in the package price; confirm.
- [ ] Remove "Lighthouse 90+" from the Websites Launch includes in `catalogue.json` if you do not want to promise it; "Recommended" replaced "Most chosen" on the Growth badges until real orders back it.
- [ ] Timeline FAQ on every service page follows Terms 5 ("the launch date moves by the same number of days"); change both together.

## Go-live order

Copied from the phase 2 plan ("Go-live order, revised after the phase 2 final review").

1. Razorpay, test mode: test keys, the test webhook (`payment.captured`, its own secret), auto-capture on, and the account's registered website includes `techpravaha.com`. If the account is shared with ATS, expect a "Payment for unknown order" alert for every ATS payment (webhooks are account-wide).
2. Resend: verify `techpravaha.com`, create the sending key (`RESEND_API_KEY`).
3. Apps Script: deploy the orders script against "TP Orders" (17 headers), copy the `/exec` URL and the token.
4. Cloudflare: create the KV namespaces and paste the ids into `wrangler.toml`; `wrangler secret put` the six secrets with the **test** keys; turn on Workers Logs; `npm run worker:deploy` on Node 22; route `api.techpravaha.com/*`; the WAF rate limit on `POST /orders`; confirm the Workers plan (Free allows 1,000 KV writes a day).
5. Growth decision: the 50% deposit is implemented; keep it, or set `depositPct` to 100 and change the copy (see the Growth note above).
6. Walkthrough on a Pages preview: `VITE_RAZORPAY_KEY_ID=rzp_test_...` in the Pages **Preview** environment only, the preview origin added to `ALLOWED_ORIGINS`. Pay by card, by UPI, and once after closing the Razorpay window; then remove the preview origin and delete the test rows.
7. After KYC: live keys and the live webhook secret on the Worker (redeploy), then the ₹1 Payment Link check.
8. Production Pages environment with `VITE_RAZORPAY_KEY_ID=rzp_live_...`, then redeploy the site.
9. Optional: buy the cheapest tier for real and refund it. Then announce.

Also before cutover: soften the Razorpay and "at checkout" payment copy if phase 2 is not live (Terms 4, Privacy "Payments", Refunds 7, home trust strip, service-page payment note, pricing FAQ, catalogue "at checkout" lines); see the README cutover checklist. Run Lighthouse against the Pages preview URL, since the local budget run uses a plain static server.

## Known gaps

- [ ] Push is blocked: `feat/phase-1-foundation` is local only, with no remote branch. Push it, open the PR to `main` and merge; unpushed work on one laptop is a liability.
- [ ] Playwright and Lighthouse CI were measured locally against a static server, not against Cloudflare Pages.
- [ ] Unverified against the live services: Gemini chat, Anthropic lab proxy and journal drafting, Razorpay checkout and webhook, Resend email, Telegram pings. Everything is tested with fakes only.
- [ ] The workflows (`ci.yml`, `deploy-worker.yml`, `journal-draft.yml`) are validated with `@action-validator/cli` and shell syntax checks but have never run on GitHub.
- [ ] ATS site (`~/Documents/GitHub/ats_website`) has the same trailing-slash canonical bug (Cloudflare Pages 308s `/x` to `/x/`; this site emits `/x/` everywhere); needs a separate PR there.
- [ ] GST on advances: the Orders Sheet shows full-order Price, GST and Total; the GST collected on a 50% deposit (for example 8,550 rupees of 56,050 on Websites Growth) is not a separate column. Ask the CA whether receipt vouchers need it, and add a column if so.
- [ ] A journal draft PR closed unmerged leaves its topic `queued` on `main` and its `journal/<slug>` branch on `origin`; delete the branch (`git push origin --delete journal/<slug>`), or every later run fails red before the paid call. The same failure follows a run that pushed the branch but could not open the PR; there, `gh pr create --base main --head journal/<slug>` keeps the paid draft.
- [ ] Placeholder gate: `npm run build && npm run check:placeholders` is a README cutover step and fails today. As of 2026-10-10 it lists `[GSTIN]`, `[registered address]` and `[city]` on /terms, "[timeline pending]" on the four work pages, and "[screenshot pending]" in the eight work SVGs.
