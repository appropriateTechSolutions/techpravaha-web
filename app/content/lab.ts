export interface LabItem {
  slug: string;
  name: string;
  /** One sentence, house voice. */
  blurb: string;
  kind: 'play' | 'extension' | 'pwa';
  /** `/lab/play/<slug>/` for playable items, an external link, or `#` until one exists. */
  href: string;
  tags: string[];
}

const play = (slug: string, name: string, blurb: string, tags: string[]): LabItem => ({
  slug,
  name,
  blurb,
  kind: 'play',
  href: `/lab/play/${slug}/`,
  tags,
});

/**
 * Small things built for fun or to test an idea. Playable items are small static
 * apps (most are one HTML file, Plot Twist is a folder) copied verbatim into
 * `public/lab/play/<slug>/`; extensions and web apps stay unlinked (`#`) until
 * they have a public listing. The three apps that use a language model
 * (Landlord Translator, Excuse Engine, Split the Awkward) call the Worker's
 * `/lab/complete` proxy instead of an AI API (host from their `tp-api` meta tag);
 * tests/content.test.ts scans every lab file for third-party API hosts.
 */
export const LAB: LabItem[] = [
  play(
    'meeting-meter',
    'Meeting Meter',
    'A live counter of what your meeting costs in real money, ticking up until someone admits it could have been an email.',
    ['Single file', 'No sign-in'],
  ),
  play(
    'chai-break',
    'Chai Break',
    'A break timer that hands you one small, slightly absurd task when the chai is getting cold.',
    ['Timer', 'No sign-in'],
  ),
  play(
    'queue-quest',
    'Queue Quest',
    'Three one-thumb games for the queue you are standing in, built to drop the moment it is your turn.',
    ['Game', 'One-handed'],
  ),
  play(
    'plot-twist',
    'Plot Twist',
    'A one-minute daily mystery: read the case file, reveal only the clues you need, name the culprit.',
    ['Daily game', 'Offline'],
  ),
  play(
    'landlord-translator',
    'Landlord Translator',
    'Paste a rental listing and get what it actually means, what it leaves out, and the questions to ask before you visit.',
    ['AI', 'Renters'],
  ),
  play(
    'excuse-engine',
    'Excuse Engine',
    'Pick a situation, set the believability dial, and get three harmless excuses with a backfire risk for each.',
    ['AI', 'Comedy'],
  ),
  play(
    'split-the-awkward',
    'Split the Awkward',
    'Splits a group bill, works out who pays whom, then writes the reminder message in the tone you pick.',
    ['AI', 'Works offline'],
  ),
  {
    slug: 'tab-tamer',
    name: 'Tab Tamer',
    blurb: 'Turns a browser full of tabs into a short daily cleanup, three tabs at a time, with nothing leaving your machine.',
    kind: 'extension',
    href: '#',
    tags: ['Chrome', 'Local-first'],
  },
  {
    slug: 'localelens',
    name: 'LocaleLens',
    blurb: 'Stretches and flips a live page to show where translated or right-to-left copy will break the layout.',
    kind: 'extension',
    href: '#',
    tags: ['Chrome', 'Localisation QA'],
  },
  {
    slug: 'should-i-buy-this',
    name: 'Should I Buy This?',
    blurb: 'Turns your shopping tabs into a comparison board with cost per use and a cooling-off timer.',
    kind: 'extension',
    href: '#',
    tags: ['Chrome', 'No tracking'],
  },
  {
    slug: 'afterbuy',
    name: 'AfterBuy',
    blurb: 'Keeps your receipts, return windows and warranties in one place on your phone, and works offline.',
    kind: 'pwa',
    href: '#',
    tags: ['Installable', 'Local-first'],
  },
  {
    slug: 'goodfind',
    name: 'GoodFind',
    blurb: 'Photograph the label on secondhand baby gear and check it against official US recall records.',
    kind: 'pwa',
    href: '#',
    tags: ['Installable', 'OCR'],
  },
  {
    slug: 'homefind',
    name: 'HomeFind',
    blurb: 'A household inventory for one question: where did we put it?',
    kind: 'pwa',
    href: '#',
    tags: ['Installable', 'Offline'],
  },
];
