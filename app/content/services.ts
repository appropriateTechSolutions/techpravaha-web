import { catalogue, getService, type Tier } from '../lib/catalogue';

export interface ServiceContent {
  id: string;
  h1: string;
  subline: string;
  facts: { label: string; value: string }[];
  afterPay: { n: string; title: string; body: string }[];
  faq: { q: string; a: string }[];
  /** Work slugs. */
  related: string[];
  metaTitle: string;
  metaDescription: string;
}

/* ---------- facts derived from catalogue.json, so the rail never drifts from the tiers ---------- */

const GST = `${Math.round(catalogue.gst * 100)}% GST`;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function tiersOf(id: string): Tier[] {
  const service = getService(id);
  if (!service) throw new Error(`services: unknown catalogue service ${id}`);
  return service.tiers;
}

function tierTime(t: Tier): string {
  if (t.weeks) return plural(t.weeks, 'week');
  if (t.days) return plural(t.days, 'day');
  return 'scoped on a call';
}

function tierPayment(t: Tier): string {
  if (t.payment) return lowerFirst(t.payment);
  if (t.terms?.includes('usage')) return 'fixed setup fee in your quote, usage billed at cost';
  return 'set in your quote';
}

/** Groups neighbouring tiers that share a value: "MVP and Bespoke: set in your quote". */
function byTier(id: string, value: (t: Tier) => string, sep: string): string {
  const groups: { labels: string[]; value: string }[] = [];
  for (const t of tiersOf(id)) {
    const v = value(t);
    const last = groups[groups.length - 1];
    if (last && last.value === v) last.labels.push(t.label);
    else groups.push({ labels: [t.label], value: v });
  }
  return groups.map((g) => `${g.labels.join(' and ')}${sep}${g.value}`).join(' · ');
}

/** "Launch 2 weeks · Growth 4 weeks · Bespoke scoped on a call" */
const timelineFact = (id: string) => byTier(id, tierTime, ' ');

/** "Launch: full payment at checkout · Growth: 50% at checkout, 50% at launch · Bespoke: set in your quote" */
const paymentFact = (id: string) => byTier(id, tierPayment, ': ');

function facts(id: string, stack: string, includes: string) {
  return [
    { label: 'Timeline', value: timelineFact(id) },
    { label: 'Stack', value: stack },
    { label: 'Includes', value: includes },
    { label: 'Payment', value: paymentFact(id) },
  ];
}

/* ---------- what happens after you pay: four steps, same shape for every service ---------- */

function afterPay(open: string, handover: string) {
  return [
    {
      n: '01',
      title: 'Receipt and intake form',
      body: 'Your GST invoice and a short intake form arrive by email. Tell us your goal, your audience and what you already have.',
    },
    {
      n: '02',
      title: 'Kickoff call',
      body: 'Book your kickoff call. We confirm the scope, the launch date and what we need from you. Your timeline starts here.',
    },
    { n: '03', title: 'Design in the open', body: open },
    { n: '04', title: 'Launch and handover', body: handover },
  ];
}

/* ---------- FAQ answers shared by every service ---------- */

const faqGst = {
  q: 'Is GST included in the price?',
  a: `No. Prices are shown before tax, and ${GST} is added on top. You get a GST invoice, so a registered business can claim input tax credit.`,
};

const faqWho = {
  q: 'Who actually does the work?',
  a: 'Yogesh Laddha, the founder, designs and builds it; there is no account manager. You deal with the person doing the work from kickoff to handover.',
};

const faqScope = (what: string) => ({
  q: 'What if I want more than the package covers?',
  a: `Tell us. ${what} We quote the change in writing before any extra work starts, and nothing is added to your bill until you agree.`,
});

/** "Launch takes 2 weeks and Growth takes 4 weeks from that call." */
function timedSentence(id: string): string {
  const timed = tiersOf(id).filter((t) => t.weeks || t.days);
  const parts = timed.map((t) => `${t.label} takes ${tierTime(t)}`);
  return `${parts.join(' and ')} from that call.`;
}

const faqTimeline = (id: string, extra = '') => ({
  q: 'When does the timeline start?',
  a: `At the kickoff call, not at payment. ${timedSentence(id)}${extra ? ` ${extra}` : ''} If something on your side takes longer, the launch date moves by the same number of days.`,
});

/* ---------- the six services ---------- */

export const SERVICES: Record<string, ServiceContent> = {
  websites: {
    id: 'websites',
    h1: 'A website that looks like you meant it.',
    subline:
      'Copy, design and build in one package, live on your own domain. Fixed scope, and a price you see before you pay.',
    facts: facts(
      'websites',
      'React and TypeScript, hosted on Cloudflare or Vercel',
      'Copy, design, build, contact form, analytics and search basics',
    ),
    afterPay: afterPay(
      'You get a preview link early. Comment on the real page, not a PDF, and watch the changes land.',
      'We put the site live on your domain, submit it to Google and walk you through it. Every login and file is yours.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds on the design, made on the live preview. More rounds are quoted like any other change, so there are no surprise bills.',
      },
      faqWho,
      faqScope('Extra pages, a booking system or a second language can all be added.'),
      {
        q: 'Who owns the site, the domain and the code?',
        a: 'You do. The domain, hosting and analytics sit in your accounts, and the code and files are handed over at launch.',
      },
      faqTimeline('websites'),
      {
        q: 'How does payment work?',
        a: 'Launch is paid in full at checkout. Growth is 50% at checkout and 50% at launch. Bespoke work gets a fixed price and payment schedule in writing after a call.',
      },
    ],
    related: ['intpro', 'home-manager'],
    metaTitle: 'Website design and development in India',
    metaDescription:
      'Website design and development for businesses in India. Copy, design, build, SEO and analytics at a fixed price you see before you pay.',
  },

  apps: {
    id: 'apps',
    h1: 'An app your customers actually open.',
    subline:
      'Start with a clickable prototype you can put in front of people. Build the first real version for Android, iOS or the web once you have seen it work.',
    facts: facts(
      'apps',
      'Flutter for Android and iOS, React or Next.js for the web, Firebase or Postgres behind it',
      'Prototype, working app, backend, store submission and source code',
    ),
    afterPay: afterPay(
      'You test it on your own phone as it takes shape: a clickable prototype first, then a new test build every week.',
      'We help you through App Store and Play Store submission, then hand over the source code, documentation and a walkthrough.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds on the screen designs. Once the screens are agreed, changes to them are quoted before the build continues.',
      },
      faqWho,
      faqScope('Most new ideas show up once people use the prototype. If a change would move the launch date, we suggest it for the next phase instead.'),
      {
        q: 'Who owns the app, the code and the accounts?',
        a: 'You do. The store listings, cloud project and code repository are set up in your name, and the source code and documentation are handed over at launch.',
      },
      faqTimeline('apps', 'An MVP gets its own dated plan in the quote.'),
      {
        q: 'How does payment work?',
        a: 'Prototype is paid in full at checkout. An MVP or bespoke build gets a fixed price and payment schedule in writing after a scoping call, before any work starts.',
      },
    ],
    related: ['exhibition-app', 'qui-ambassador-app', 'intpro'],
    metaTitle: 'Mobile and web app development in India',
    metaDescription:
      'Mobile and web app development in India, from a one-week clickable prototype to a working MVP on Android and iOS. Fixed price agreed before we start.',
  },

  ai: {
    id: 'ai',
    h1: 'An AI front door that answers at 2am.',
    subline:
      'A chat or voice assistant that answers from your own documents, on your website, WhatsApp or phone line. When it is unsure, it hands over to a person.',
    facts: facts(
      'ai',
      'Language models answering from your documents, on your site, WhatsApp or phone number',
      'Assistant setup, human handover, conversation logs and a tested question set',
    ),
    afterPay: afterPay(
      'You try the assistant on your own questions while we tune it. Before launch we run it against a set of real questions and show you every answer.',
      'It goes live on your site, WhatsApp or number. You get the conversation log and a walkthrough of how it answers and when it hands over.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds of changes to tone, answers and handover rules after you have tested it. Later changes are quoted first.',
      },
      faqWho,
      faqScope('Bookings, order lookups or a second language are common next steps.'),
      {
        q: 'Who owns the assistant and the conversations?',
        a: 'You do. Your documents, the conversation logs and the model and telephony accounts stay in your name, and the setup is handed over at launch.',
      },
      faqTimeline('ai', 'A call centre setup gets its own dated plan in the quote.'),
      {
        q: 'How does payment work, and what does it cost to run?',
        a: 'The Assistant is paid in full at checkout. A call centre has a setup fee quoted after a call. Usage is billed per minute at cost, on accounts in your name. Running costs are explained before go-live.',
      },
    ],
    related: ['home-manager'],
    metaTitle: 'AI chatbots and voice agents in India',
    metaDescription:
      'AI chat and voice assistants for businesses in India, trained on your documents and live on your site, WhatsApp or phone line. Fixed scope and price.',
  },

  whatsapp: {
    id: 'whatsapp',
    h1: 'WhatsApp that sells while you sleep.',
    subline:
      'Get verified on the WhatsApp Business API, then let replies, follow-ups and broadcasts run on rules you set. Your team steps in when a lead is ready.',
    facts: facts(
      'whatsapp',
      'WhatsApp Business API, a shared team inbox, Google Sheets or your CRM',
      'Verified account, approved templates, lead capture, follow-ups and broadcasts',
    ),
    afterPay: afterPay(
      'You see every template and flow before it goes to Meta for approval or reaches a customer. Test it from your own phone first.',
      'The flows go live on your number. Your team gets the shared inbox and a walkthrough of every flow and template.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds of changes on messages and flows before launch. Later changes are quoted first.',
      },
      faqWho,
      faqScope('In-chat ordering, payments or a link to your POS can be added later.'),
      {
        q: 'Who owns the WhatsApp account and the contacts?',
        a: 'You do. The Business API account, phone number and Meta business account are in your name, and so is every contact and opt-in list.',
      },
      faqTimeline(
        'whatsapp',
        'Template approval and business verification run on Meta\'s schedule, not ours.',
      ),
      {
        q: 'How does payment work?',
        a: "Setup is paid in full at checkout. Automation is 50% at checkout and 50% at launch. Meta's own per-message charges are billed by Meta or your provider and are not part of our price.",
      },
    ],
    related: ['intpro'],
    metaTitle: 'WhatsApp Business API automation in India',
    metaDescription:
      'WhatsApp Business API setup and automation in India: verified account, lead capture, follow-ups and broadcasts. Fixed scope, price shown upfront.',
  },

  content: {
    id: 'content',
    h1: 'Content that ships every week without you.',
    subline:
      'A pipeline that turns a topic sheet into drafts in your voice, queues them for your approval and publishes what you pass. Nothing goes out without your yes.',
    facts: facts(
      'content',
      'A Google Sheets topic list, AI drafting, and your blog, LinkedIn, X or email',
      'Topic sheet, drafts in your voice, approval step, publishing and a runbook',
    ),
    afterPay: afterPay(
      'We build your style guide from writing you already have, then show you the first drafts before anything runs on its own.',
      'The pipeline runs on your accounts. You get a walkthrough and a written runbook, and you still approve every post.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds on the style guide and draft format before the pipeline runs on its own. After that you edit or reject each draft in the review step.',
      },
      faqWho,
      faqScope('More channels, video scripts or a second language can be added.'),
      {
        q: 'Who owns the pipeline and the content?',
        a: 'You do. The topic sheet, the pipeline, every draft and the accounts it publishes to are yours, handed over at launch.',
      },
      faqTimeline('content'),
      {
        q: 'How does payment work?',
        a: 'Starter is paid in full at checkout. Studio is 50% at checkout and 50% at launch. Bespoke pipelines get a fixed price and payment schedule in writing after a call.',
      },
    ],
    related: [],
    metaTitle: 'Content automation for businesses in India',
    metaDescription:
      'Content automation for businesses in India: drafts in your voice from a topic sheet, approved by you, published to your blog, LinkedIn or email.',
  },

  design: {
    id: 'design',
    h1: 'Design that makes the product obvious.',
    subline:
      'Start with an audit of the screens that cost you users, ranked by impact. Then redesign them into a system your developers can build from.',
    facts: facts(
      'design',
      'Figma, with developer-ready specs',
      'Usability and accessibility audit, redesign, design system and handoff',
    ),
    afterPay: afterPay(
      'You get a shared Figma file from day one. Comment on screens as they take shape instead of waiting for a final reveal.',
      'You get the findings or the finished screens, a recorded walkthrough and specs your developers can build from.',
    ),
    faq: [
      faqGst,
      {
        q: 'How many rounds of revisions do I get?',
        a: 'Two rounds of revisions on the redesigned screens. More rounds are quoted like any other change.',
      },
      faqWho,
      faqScope('More screens, user testing or building the new design in code can be added.'),
      {
        q: 'Who owns the designs?',
        a: 'You do. The Figma files, components and specs are yours, handed over at launch.',
      },
      faqTimeline('design'),
      {
        q: 'How does payment work?',
        a: 'The Audit is paid in full at checkout. The Redesign is 50% at checkout and 50% at launch. Bespoke work gets a fixed price and payment schedule in writing after a call.',
      },
    ],
    related: ['qui-ambassador-app', 'intpro'],
    metaTitle: 'UI/UX design and audits in India',
    metaDescription:
      'UI/UX design in India: usability and accessibility audits, then redesigns in Figma with a design system and developer-ready handoff. Fixed price.',
  },
};
