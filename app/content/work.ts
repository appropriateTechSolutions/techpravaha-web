export type WorkStatus = 'live' | 'in-progress';

export const STATUS_LABEL: Record<WorkStatus, string> = { live: 'Live', 'in-progress': 'In progress' };

export interface WorkItem {
  slug: string;
  name: string;
  client?: string;
  /** Spec track name (the "launched" work track); not shown on the page. */
  track: 'launched';
  /** What the page shows: is it live, or still being built. */
  status: WorkStatus;
  oneLiner: string;
  problem: string;
  shipped: string[];
  stack: string[];
  timeline: string;
  /** Public paths, e.g. `/work/<slug>/1.svg`. Placeholders until real screenshots land. */
  images: string[];
  /** Catalogue service ids. */
  services: string[];
  featured?: boolean;
}

const shots = (slug: string) => [`/work/${slug}/1.svg`, `/work/${slug}/2.svg`];

/**
 * Client work and own products, named with permission (cleared 2026-10-10).
 * Facts come from each project's own docs. No numbers or outcomes are claimed
 * that the project has not measured.
 */
export const WORK: WorkItem[] = [
  {
    slug: 'exhibition-app',
    name: 'Exhibition App',
    client: 'Trade exhibition organiser, India',
    track: 'launched',
    status: 'live',
    oneLiner: 'An attendee app and admin console for a trade exhibition, with QR badge codes and exhibitor scanning.',
    problem:
      'A Flutter app for exhibitors, visitors, members and delegates, each with their own role, and a web console where the organiser manages attendee data. Both run on one Firebase project.',
    shipped: [
      'Attendee app for Android and iOS',
      'QR passes: scan a badge or type its code to find the person',
      'Exhibitor QR scans that open their profile and keep a list of who you scanned',
      'Roles for exhibitors, visitors, members and delegates, with directories to browse',
      'Private notes on any profile you open',
      'Web admin console on the same Firebase project',
      'Attendee import pipeline in Cloud Functions',
    ],
    stack: ['Flutter', 'Firebase Auth', 'Cloud Firestore', 'Cloud Functions', 'Firebase Storage', 'Flutter web'],
    timeline: '[timeline pending]',
    images: shots('exhibition-app'),
    services: ['apps'],
    featured: true,
  },
  {
    slug: 'qui-ambassador-app',
    name: 'Qui Ambassador App',
    client: 'Qui Tequila',
    track: 'launched',
    status: 'live',
    oneLiner: "A dashboard-first mobile app for Qui Tequila's brand ambassadors.",
    problem:
      'Ambassadors used AppSheet, the same tool as the admin team. Qui wanted an ambassador app that felt like the brand rather than a reporting system, without moving the admin side off AppSheet and Google Sheets.',
    shipped: [
      'Home dashboard with shifts, performance and earnings at a glance',
      'Schedule of upcoming shifts',
      'Tasting event workflow, step by step',
      'Expense and activity submission with photos saved to Google Drive',
      'Performance dashboard and earnings summary',
      'Cloud Run API in front of Google Sheets, so the admin side did not have to change',
    ],
    stack: ['Flutter', 'Riverpod', 'Cloud Run', 'Google Sheets', 'Google Drive'],
    timeline: '[timeline pending]',
    images: shots('qui-ambassador-app'),
    services: ['apps', 'design'],
    featured: true,
  },
  {
    slug: 'home-manager',
    name: 'Home Manager',
    track: 'launched',
    status: 'live',
    oneLiner: 'One place for home improvement: expenses, contractors, materials and progress photos.',
    problem:
      'A home management app that tracks home improvement expenses, vendors, materials and progress photos, with Google Sheets as its database and Google Drive for photos.',
    shipped: [
      'Dashboard of spend, vendors and progress',
      'Expense tracking with categories suggested by Gemini',
      'Vendor and contractor list',
      'Progress photo gallery stored in Google Drive',
      'Materials and supplies inventory',
      'Google sign-in and a mobile layout with bottom navigation',
    ],
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Node.js', 'Express', 'Google Sheets API', 'Google Drive API', 'Gemini'],
    timeline: '[timeline pending]',
    images: shots('home-manager'),
    services: ['apps', 'ai'],
  },
  {
    slug: 'intpro',
    name: 'IntPro',
    track: 'launched',
    status: 'in-progress',
    oneLiner: 'Software for Indian interior design studios, with a client dashboard that opens from a link. In progress.',
    problem:
      'Interior studios juggle clients, approvals and GST paperwork across chats and spreadsheets. Their clients want to see where the project stands without making another account.',
    shipped: [
      'Studio back office for clients, projects and approvals',
      'Quotes, GST tax invoices, milestone billing, credit notes and receipts',
      'Client dashboard opened from a link sent on WhatsApp, with no password to remember',
      'Per-contact controls over who sees money, documents and approvals',
      'Quote and invoice PDFs generated in the app',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'tRPC', 'Drizzle', 'Postgres', 'Tailwind CSS'],
    timeline: 'In progress · [timeline pending]',
    images: shots('intpro'),
    services: ['apps', 'design', 'whatsapp'],
    featured: true,
  },
];
