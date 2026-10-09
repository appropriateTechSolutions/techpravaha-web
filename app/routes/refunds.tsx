import { Link } from 'react-router';
import type { Route } from './+types/refunds';
import { pageMeta } from '../lib/site';
import { formatINR, getTier } from '../lib/catalogue';
import { CANCEL_MESSAGE, EmailLink, LegalPage, WhatsAppLink, type Clause } from '../components/LegalPage';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Refunds and cancellation',
    description:
      'Cancel any time by email or WhatsApp. Full refund before the kickoff call; after it, a refund pro-rated by the days of the package timeline. Refunds reach you in 7 to 10 working days.',
    path: '/refunds',
  });
}

// Worked example from the catalogue, so it never disagrees with the price on the site.
const example = getTier('websites-launch');
const EXAMPLE = (() => {
  if (!example || example.tier.price === null || !example.tier.weeks) return null;
  const price = example.tier.price;
  const days = example.tier.weeks * 7;
  const used = 4;
  const value = Math.round((price * used) / days);
  return {
    name: `${example.service.name} · ${example.tier.label}`,
    price: formatINR(price),
    days,
    used,
    value: formatINR(value),
    refund: formatINR(price - value),
  };
})();

const CLAUSES: Clause[] = [
  {
    title: 'How to cancel',
    body: (
      <>
        <p>
          Email <EmailLink /> or message us on <WhatsAppLink message={CANCEL_MESSAGE} />. Tell us your name
          and the package or invoice you want to cancel.
        </p>
        <p>The day we receive your message is the cancellation date. We confirm the refund amount in writing.</p>
      </>
    ),
  },
  {
    title: 'Before the kickoff call: full refund',
    body: (
      <p>
        If you cancel before the kickoff call, we refund everything you paid, including GST.
      </p>
    ),
  },
  {
    title: 'After the kickoff call: pro-rated refund',
    body: (
      <>
        <p>
          If you cancel after the kickoff call, we refund the package price you have paid (before GST)
          minus the value of the work completed, and we also refund the GST on that amount. The value of the work completed is the package price, divided by the number of days
          in the package timeline, multiplied by the number of days from the kickoff call to the
          cancellation date. Days are calendar days, so a 2-week timeline is 14 days.
        </p>
        {EXAMPLE && (
          <p>
            For example, {EXAMPLE.name} is {EXAMPLE.price} with a {EXAMPLE.days}-day timeline. If you
            cancel {EXAMPLE.used} days after the kickoff call, the work completed is valued at{' '}
            {EXAMPLE.value} and we refund {EXAMPLE.refund}, plus the GST on that amount.
          </p>
        )}
        <p>
          The value of the work completed is never more than the package price. If it is equal to or more
          than what you have paid, no refund is due.
        </p>
      </>
    ),
  },
  {
    title: 'Packages paid 50/50',
    body: (
      <p>
        Some packages are paid 50% at checkout and 50% at launch. The same rule applies to what you have
        paid so far. For example, if you have paid 50% and the work completed is valued at 20% of the
        price, we refund the other 30%, plus the GST on it.
      </p>
    ),
  },
  {
    title: 'Quoted and bespoke work',
    body: (
      <p>
        For work we quoted after a call, we use the price and timeline in your written quote. Where the
        quote splits the work into phases, the rule applies to the phase in progress.
      </p>
    ),
  },
  {
    title: 'After launch',
    body: (
      <p>
        Once we have launched and handed over the work, the package is complete and no refund is due.
        Changes after launch are a scope change under our <Link to="/terms">terms</Link>.
      </p>
    ),
  },
  {
    title: 'How refunds are paid',
    body: (
      <>
        <p>
          Refunds go back to the original payment method through Razorpay, within 7 to 10 working days of
          the cancellation date. Your bank may take a little longer to show it.
        </p>
        <p>
          We refund the GST charged on the refunded amount and send you a credit note for your records.
        </p>
      </>
    ),
  },
  {
    title: 'Contact',
    body: (
      <p>
        Questions about a cancellation or refund: <EmailLink /> or{' '}
        <WhatsAppLink message="Hi Tech Pravaha, I have a question about a refund." />.
      </p>
    ),
  },
];

export default function Refunds() {
  return (
    <LegalPage
      title="Refunds and cancellation"
      intro={
        <p>
          You can cancel any package at any time. Before the kickoff call you get everything back. After
          it, you pay only for the part of the timeline that has passed.
        </p>
      }
      clauses={CLAUSES}
    />
  );
}
