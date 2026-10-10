import type { ReactNode } from 'react';
import { Section } from './ui/Section';
import { BookCallButton } from './BookCallButton';
import { WhatsAppCta } from './WhatsAppCta';

interface ClosingCtaProps {
  title: ReactNode;
  intro?: ReactNode;
  eyebrow?: ReactNode;
  /** Prefilled WhatsApp message naming the page. */
  message: string;
  /** Page path for analytics. */
  page: string;
  /** Extra classes for the Section, e.g. a smaller bottom padding when a TeardownNote follows. */
  className?: string;
}

/** The "Start a project" section that closes a page: book a call plus WhatsApp. */
export function ClosingCta({ title, intro, eyebrow = 'Start a project', message, page, className }: ClosingCtaProps) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro} className={className}>
      <div className="flex flex-wrap gap-3">
        <BookCallButton page={page} size="lg" />
        <WhatsAppCta message={message} page={page} size="lg" />
      </div>
    </Section>
  );
}
