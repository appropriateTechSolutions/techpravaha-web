/**
 * The ten checks behind the free site teardown (/teardown). Plain points a founder can act on
 * today, whether or not they hire us. No stats: these are checks, not claims.
 */
export interface TeardownPoint {
  title: string;
  body: string;
}

export const TEARDOWN_POINTS: TeardownPoint[] = [
  {
    title: 'First impression and promise',
    body: 'Can a stranger say what you sell, and who it is for, within five seconds of landing? We read your top screen the way a first-time visitor does.',
  },
  {
    title: 'One clear action',
    body: 'Each page should point to one next step: call, message, buy, book. We check that the step is obvious and that nothing else competes with it.',
  },
  {
    title: 'Speed on a phone',
    body: 'We load the site on a mid-range phone over a normal mobile connection and note what is slow, usually oversized images and heavy scripts.',
  },
  {
    title: 'Search basics',
    body: 'Page titles, descriptions, headings and a sitemap. We check that Google can read the site and that each page says what it is about.',
  },
  {
    title: 'Proof and trust signals',
    body: 'Real names, real work, real contact details, a clear refund or privacy page. We check whether a cautious buyer finds a reason to trust you.',
  },
  {
    title: 'The contact path',
    body: 'How many taps from any page to reaching you? We test the form, the phone and WhatsApp links, and what happens after someone sends a message.',
  },
  {
    title: 'Copy clarity',
    body: 'Short sentences, plain words, no filler. We flag lines that say little and spots where a buyer would ask "meaning what?".',
  },
  {
    title: 'Mobile layout',
    body: 'Most visitors arrive on a phone. We check text size, tap targets, sideways scrolling and whether the main action stays in reach.',
  },
  {
    title: 'Analytics in place',
    body: 'Can you tell where visitors come from and which page loses them? We check that basic tracking exists and that the key action is counted.',
  },
  {
    title: 'Accessibility basics',
    body: 'Contrast, readable text, image descriptions, forms with labels, use by keyboard. These help every visitor and cost little to fix early.',
  },
];
