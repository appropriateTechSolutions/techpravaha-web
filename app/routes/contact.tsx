import { EnvelopeSimple } from '@phosphor-icons/react';
import type { Route } from './+types/contact';
import { useOrderParam } from '../lib/orderParam';
import { CONTACT_EMAIL, HAS_BOOKING, pageMeta } from '../lib/site';
import { tierMessage } from '../lib/whatsapp';
import { BookCallButton } from '../components/BookCallButton';
import { Eyebrow } from '../components/ui/Eyebrow';
import { ContactForm, useQuotedTier } from '../components/ContactForm';
import { WhatsAppCta } from '../components/WhatsAppCta';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Contact',
    description:
      `Tell Tech Pravaha what you want to launch. Message on WhatsApp, use the form, or email ${CONTACT_EMAIL}. We reply within one working day.`,
    path: '/contact',
    image: '/og/contact.png',
  });
}

const DEFAULT_MESSAGE = 'Hi Tech Pravaha, I want to talk about a project.';

// Without an external booking page, BookCallButton renders nothing here (it would link to this page).

export default function Contact() {
  const picked = useQuotedTier();
  const orderId = useOrderParam();
  // A paid order (the /thanks intake link) is not a quote request.
  const waMessage = orderId
    ? `Hi Tech Pravaha, order ${orderId}: here are my details and references.`
    : picked
      ? tierMessage(picked.service.name, picked.tier.label, null)
      : DEFAULT_MESSAGE;

  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-24 md:pt-40 md:pb-28">
      <div className="max-w-[880px]">
        <Eyebrow dot className="mb-8">
          Contact
        </Eyebrow>
        <h1 className="display-2">Tell us what you want to launch.</h1>
        <p className="mt-8 max-w-[56ch] text-[19px] leading-relaxed text-ink-2">
          WhatsApp is the quickest way to reach us. The form and email work too. We reply within one
          working day.
        </p>
        <div className="mt-10">
          <WhatsAppCta message={waMessage} page="/contact" size="lg" />
        </div>
      </div>

      <div className="mt-16 grid gap-12 border-t border-line pt-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-20">
        <div className="max-w-[720px]">
          <h2 className="display-3 mb-8">Or send a message.</h2>
          <ContactForm />
        </div>

        <aside className="grid content-start gap-10">
          {HAS_BOOKING && (
            <div>
              <h2 className="display-3 mb-3">Prefer a call?</h2>
              <p className="mb-5 text-ink-2">Pick a time for a short call about your project.</p>
              <BookCallButton page="/contact" variant="secondary" icon />
            </div>
          )}
          <div>
            <h2 className="display-3 mb-3">Email</h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-11 items-center gap-2 text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              <EnvelopeSimple size={18} aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
