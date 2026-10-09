import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CONTACT_EMAIL } from '../lib/site';
import { waLink } from '../lib/whatsapp';
import { Eyebrow } from './ui/Eyebrow';

/** One date for all three legal pages; change it whenever any of them changes. */
export const LEGAL_UPDATED = { label: '10 October 2026', iso: '2026-10-10' };

/** Placeholders Yogesh fills in (morning notes). Rendered as-is until then. */
export const GSTIN = '[GSTIN]';
export const REGISTERED_ADDRESS = '[registered address]';
export const JURISDICTION_CITY = '[city]';

/** Prefilled WhatsApp text for cancellations (Terms and Refunds). */
export const CANCEL_MESSAGE = 'Hi Tech Pravaha, I want to cancel my order.';

export interface Clause {
  title: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: ReactNode;
  clauses: Clause[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Terms, Privacy, Refunds: eyebrow, h1, last-updated line, then numbered h2 clauses. */
export function LegalPage({ title, intro, clauses }: LegalPageProps) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-24 md:pt-40 md:pb-28">
      <Eyebrow dot className="mb-8">
        Legal
      </Eyebrow>
      <h1 className="display-2 max-w-[1040px]">{title}</h1>
      <p className="label-mono mt-8">
        <time dateTime={LEGAL_UPDATED.iso}>{`Last updated: ${LEGAL_UPDATED.label}`}</time>
      </p>

      <div className="prose-tp mt-12">
        {intro}
        {clauses.map((c, i) => (
          // Fragment keeps every clause element a direct child, so .prose-tp spacing applies.
          <Fragment key={c.title}>
            <h2 id={slug(c.title)}>{`${i + 1}. ${c.title}`}</h2>
            {c.body}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

export function EmailLink() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}

/** WhatsApp with a prefilled message; the contact page while the number is unset. */
export function WhatsAppLink({ message, children = 'WhatsApp' }: { message: string; children?: ReactNode }) {
  const href = waLink(message);
  if (href === '/contact') return <Link to="/contact">{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
