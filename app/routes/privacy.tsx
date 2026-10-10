import { Link } from 'react-router';
import type { Route } from './+types/privacy';
import { pageMeta } from '../lib/site';
import { EmailLink, LegalPage, type Clause } from '../components/LegalPage';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Privacy policy',
    description:
      'What Tech Pravaha collects through its forms, the chat assistant, the lab apps, the hosted apps, WhatsApp, payments and analytics (Google Analytics 4 and Microsoft Clarity), where it is kept, and how to have it deleted.',
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
    title: 'What our forms collect',
    body: (
      <>
        <p>When you send the contact form or the free teardown form, we receive:</p>
        <ul>
          <li>your name and email address;</li>
          <li>your phone number, if you add it;</li>
          <li>your message;</li>
          <li>your site address, if you ask for a teardown;</li>
          <li>the page you sent it from, and the package or order you asked about, if any.</li>
        </ul>
        <p>
          This goes into a private Google Sheet that only Tech Pravaha can open. We use it to reply to you,
          quote for your project and follow up on it.
        </p>
        <p>
          Each message also triggers a Telegram message to the founder that carries your name and email,
          the page you sent it from and, for a teardown, your site address. Telegram, Cloudflare (which runs
          the service that receives the form) and Google (the Sheet) process it for us.
        </p>
      </>
    ),
  },
  {
    title: 'Chat assistant',
    body: (
      <>
        <p>
          The chat assistant on the site is an AI. When you send it a message, your message and the earlier
          messages in that conversation go through our Cloudflare Worker to Anthropic's API, which
          generates the reply. We do not store the conversation.
        </p>
        <p>
          The transcript stays in your browser's local storage until you clear it. Use the "Clear chat" link
          in the chat first; clearing your browser's site data for techpravaha.com also removes it. Do not share passwords, card numbers or other
          sensitive details in the chat.
        </p>
      </>
    ),
  },
  {
    title: 'Lab apps',
    body: (
      <p>
        Text you enter in the three AI lab apps (Landlord Translator, Excuse Engine and Split the Awkward)
        goes through our Cloudflare Worker to Anthropic's API to generate a result, and is not stored by us.
        The lab apps load their fonts from Google Fonts, so Google receives that request.
      </p>
    ),
  },
  {
    title: 'Hosted apps',
    body: (
      <>
        <p>
          HomeFind, GoodFind and Plot Twist run on techpravaha.com. HomeFind and Plot Twist keep their data
          on your device only, in your browser's storage. Nothing from them is sent to us.
        </p>
        <p>
          GoodFind sends the label text you enter to the US Consumer Product Safety Commission's public
          recall search (saferproducts.gov), and loads its text-recognition files from jsDelivr's CDN.
        </p>
        <p>
          These apps share techpravaha.com's browser storage, so clearing site data for techpravaha.com also
          clears their data.
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
      <>
        <p>
          When you buy a package, payment is handled by Razorpay. We do not see or store your card, UPI or
          bank details. We receive your name, email, phone number, your company and GSTIN if you give them,
          and whether the payment went through. We use these to issue your invoice, send your receipt and
          start the work.
        </p>
        <ul>
          <li>Razorpay processes the payment.</li>
          <li>Resend sends your receipt email.</li>
          <li>
            Each paid order triggers a Telegram message to the founder with your name, the package and the
            amount (or an email, if Telegram is not set up).
          </li>
          <li>
            Cloudflare stores the order record in Workers KV. We keep it until you ask us to delete it.
          </li>
          <li>A copy of each paid order goes into a private Google Sheet that only Tech Pravaha can open.</li>
        </ul>
      </>
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
            does not record what you type into forms, and the chat conversation is masked in recordings.
          </li>
        </ul>
        <p>
          Both tools set cookies in your browser. You can block or delete cookies in your browser settings
          and the site still works. We also store your light or dark theme choice in your browser; that
          choice never leaves your device. The chat transcript is stored in your browser too, and is sent with
          each new chat message (see Chat assistant).
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
        emails you send us are held by Google.
      </p>
    ),
  },
  {
    title: 'What we do not do',
    body: (
      <p>
        We do not sell your data, rent it or share it for advertising. We send it only to the services named
        on this page (Cloudflare, Google, Microsoft, Anthropic, Razorpay, Resend, Telegram, Meta for
        WhatsApp, and for GoodFind the US Consumer Product Safety Commission and jsDelivr), which we use to run the site and our work, or to a government authority when Indian law
        requires it.
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
        delete it from our Sheets, our inbox and our order records in Cloudflare Workers KV, and confirm by
        email. Records we must keep by law, such as tax invoices, are kept until that period ends.
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
