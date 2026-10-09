import { Link } from 'react-router';
import type { Route } from './+types/privacy';
import { pageMeta } from '../lib/site';
import { EmailLink, LegalPage, type Clause } from '../components/LegalPage';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Privacy policy',
    description:
      'What Tech Pravaha collects through the contact form, WhatsApp, payments and analytics (Google Analytics 4 and Microsoft Clarity), where it is kept, and how to have it deleted.',
    path: '/privacy',
  });
}

const CLAUSES: Clause[] = [
  {
    title: 'Who we are',
    body: (
      <p>
        Tech Pravaha is a registered business in India that runs techpravaha.com. We decide how the
        personal data described here is used. For any privacy question, write to <EmailLink />.
      </p>
    ),
  },
  {
    title: 'What the contact form collects',
    body: (
      <>
        <p>When you send the contact form, we receive:</p>
        <ul>
          <li>your name and email address;</li>
          <li>your phone number, if you add it;</li>
          <li>your message;</li>
          <li>the page you sent it from, and the package you asked about, if any.</li>
        </ul>
        <p>
          This goes into a private Google Sheet that only Tech Pravaha can open. We use it to reply to you,
          quote for your project and follow up on it.
        </p>
      </>
    ),
  },
  {
    title: 'WhatsApp',
    body: (
      <p>
        If you message us on WhatsApp, the conversation is held in WhatsApp Business. Meta runs WhatsApp,
        and its own privacy policy applies to that service. We use the conversation only to talk to you
        about your project.
      </p>
    ),
  },
  {
    title: 'Payments',
    body: (
      <p>
        When you buy a package, payment is handled by Razorpay. We do not see or store your card, UPI or
        bank details. We receive your name, email, phone number, your GSTIN if you give it, and whether the
        payment went through. We use these to issue your invoice, send your receipt and start the work.
      </p>
    ),
  },
  {
    title: 'Analytics',
    body: (
      <>
        <p>We use two analytics tools to see how the site is used and where it can be clearer.</p>
        <ul>
          <li>
            Google Analytics 4 records the pages you visit, how you reached the site, your device and
            browser type, your approximate location, and clicks on buttons such as WhatsApp and "Book a
            call".
          </li>
          <li>
            Microsoft Clarity makes session recordings: how you scroll, move and click on each page. It
            does not record what you type into forms.
          </li>
        </ul>
        <p>
          Both tools set cookies in your browser. You can block or delete cookies in your browser settings
          and the site still works. We also store your light or dark theme choice in your browser; it never
          leaves your device.
        </p>
        <p>
          On your first visit a one-line notice at the bottom of the page names these two tools, and they load
          only after it has appeared; pressing OK hides it, and your browser remembers that on your device.
        </p>
      </>
    ),
  },
  {
    title: 'Hosting and email',
    body: (
      <p>
        Cloudflare hosts the site and keeps request logs, such as your IP address, browser type and the page
        you asked for, to serve and protect it. hello@techpravaha.com is a Google Workspace mailbox, so the
        emails you send us, and the copy of each form enquiry we receive by email, are held by Google.
      </p>
    ),
  },
  {
    title: 'What we do not do',
    body: (
      <p>
        We do not sell your data, rent it or share it for advertising. It goes only to the services named
        on this page, which we use to run the site and our work, or to a government authority when Indian
        law requires it.
      </p>
    ),
  },
  {
    title: 'How long we keep it',
    body: (
      <p>
        We keep enquiries while we are talking to you about a project and for follow-up after it. We keep
        invoices and payment records for as long as Indian tax law requires.
      </p>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <p>
        Email <EmailLink /> to ask what data we hold about you, to correct it, or to have it deleted. We
        delete it from our Sheet and inbox and confirm by email. Records we must keep by law, such as tax
        invoices, are kept until that period ends.
      </p>
    ),
  },
  {
    title: 'Changes to this policy',
    body: (
      <p>
        If we change what we collect or how we use it, we update this page and the date at the top. Our{' '}
        <Link to="/terms">terms of service</Link> cover everything else about working with us.
      </p>
    ),
  },
  {
    title: 'Contact',
    body: (
      <p>
        Privacy questions and deletion requests: <EmailLink />.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          This page explains what we collect when you use techpravaha.com, contact us or buy from us, where
          it is kept and how to have it deleted.
        </p>
      }
      clauses={CLAUSES}
    />
  );
}
