import { Link } from 'react-router';
import type { Route } from './+types/terms';
import { pageMeta } from '../lib/site';
import {
  CANCEL_MESSAGE,
  EmailLink,
  GSTIN,
  JURISDICTION_CITY,
  LegalPage,
  REGISTERED_ADDRESS,
  WhatsAppLink,
  type Clause,
} from '../components/LegalPage';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Terms of service',
    description:
      'The terms for buying a package from Tech Pravaha: scope, prices and GST, payment, revisions, ownership, cancellations and governing law.',
    path: '/terms',
  });
}

const CLAUSES: Clause[] = [
  {
    title: 'Who we are',
    body: (
      <>
        <p>
          Tech Pravaha is a registered business in India. Our GSTIN is {GSTIN} and our registered address
          is {REGISTERED_ADDRESS}. You can reach us at <EmailLink />.
        </p>
        <p>
          In these terms, "we" and "us" mean Tech Pravaha. "You" means the person or business buying
          from us.
        </p>
      </>
    ),
  },
  {
    title: 'What you are buying',
    body: (
      <>
        <p>
          We design and build websites, apps, AI assistants, WhatsApp automation, content automation and
          UI/UX design. Each package page lists what the package includes and how long it takes. That
          list is the scope. Anything not on it is outside the package.
        </p>
        <p>
          Bespoke work, and packages shown with a "from" price, are scoped on a call. Before any work
          starts we send a written quote with the scope, price, timeline and payment schedule.
        </p>
        <p>
          All work is delivered online. Nothing is shipped to you. You receive the finished work on your
          domain, in your accounts or as files, as the package describes.
        </p>
      </>
    ),
  },
  {
    title: 'Prices and GST',
    body: (
      <>
        <p>
          Prices on this site are in Indian rupees and do not include GST. GST at 18% is added at
          checkout and shown on your tax invoice. If you give us your GSTIN, it goes on the invoice.
        </p>
        <p>
          Fees charged by other providers are not part of our price unless the package says so. Examples
          are domain registration, hosting, WhatsApp messaging charges from Meta, and AI usage. Those
          providers bill your accounts directly, or we pass the cost on at cost where your quote says so.
        </p>
      </>
    ),
  },
  {
    title: 'Payment',
    body: (
      <>
        <p>You pay through Razorpay, by UPI, card or netbanking. Each package page shows its terms.</p>
        <ul>
          <li>Packages paid in full at checkout: the full price is paid when you buy.</li>
          <li>Packages paid 50/50: 50% is paid at checkout and 50% at launch.</li>
          <li>Quoted work: paid on the schedule in your written quote.</li>
          <li>The Care add-on is invoiced monthly.</li>
        </ul>
        <p>Work starts once the first payment has reached us and the kickoff call is booked.</p>
      </>
    ),
  },
  {
    title: 'Timeline',
    body: (
      <p>
        The timeline on each package page counts from the kickoff call. It assumes we get your content,
        account access and feedback when we ask for them. If we are waiting on you, the launch date moves
        by the same number of days, and we tell you in writing.
      </p>
    ),
  },
  {
    title: 'Revisions',
    body: (
      <p>
        The design phase of every package includes two rounds of revisions within the agreed scope.
        More rounds count as a scope change.
      </p>
    ),
  },
  {
    title: 'Scope changes',
    body: (
      <p>
        If you want something outside the scope, we quote it in writing first, with the price and any
        change to the timeline. Work on that change starts only after you accept the quote. We do not
        add charges you have not agreed to in writing.
      </p>
    ),
  },
  {
    title: 'Your part',
    body: (
      <p>
        You are responsible for the content you give us, such as text, images, logos and data, and for
        having the right to use it. After handover you are responsible for the accounts in your name,
        including their passwords.
      </p>
    ),
  },
  {
    title: 'Ownership and handover',
    body: (
      <>
        <p>
          The domain and the accounts the work runs on are in your name from day one. At launch we hand
          over the code and every login. Ownership of the work we make for you transfers to you on full
          payment.
        </p>
        <p>Open-source libraries and third-party tools in the work stay under their own licences.</p>
      </>
    ),
  },
  {
    title: 'Cancellations and refunds',
    body: (
      <p>
        You can cancel at any time by email or <WhatsAppLink message={CANCEL_MESSAGE} />.
        Refunds follow our <Link to="/refunds">refunds and cancellation policy</Link>: a full refund before
        the kickoff call, and a pro-rated refund after it.
      </p>
    ),
  },
  {
    title: 'Liability',
    body: (
      <p>
        Our total liability for any claim about a package is limited to the amount you paid us for that package. We are not
        responsible for outages or changes in services run by other companies, such as hosting providers,
        Meta, Google, payment gateways or AI providers.
      </p>
    ),
  },
  {
    title: 'Governing law and disputes',
    body: (
      <p>
        These terms are governed by the laws of India. If we disagree about something, write to us first
        and we will try to settle it with you directly. If we cannot, the courts of {JURISDICTION_CITY},
        India have jurisdiction.
      </p>
    ),
  },
  {
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms. The date at the top of this page shows the current version. The terms
        in force on the day you paid apply to that purchase.
      </p>
    ),
  },
  {
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: <EmailLink />. How we handle your data is in our{' '}
        <Link to="/privacy">privacy policy</Link>.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      intro={
        <p>
          These terms apply when you use techpravaha.com or buy a package or quoted project from Tech
          Pravaha. Paying for a package means you accept them. If anything here is unclear, ask us before
          you pay.
        </p>
      }
      clauses={CLAUSES}
    />
  );
}
