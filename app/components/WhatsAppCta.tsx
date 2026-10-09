import { WhatsappLogo } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { waLink } from '../lib/whatsapp';
import { Button } from './ui/Button';

interface WhatsAppCtaProps {
  message: string;
  label?: string;
  /** Page path for analytics, e.g. '/services/apps'. */
  page: string;
  size?: 'md' | 'lg';
}

/** Secondary button that opens WhatsApp with a prefilled message; /contact until the number is set. */
export function WhatsAppCta({ message, label = 'Message on WhatsApp', page, size }: WhatsAppCtaProps) {
  const href = waLink(message);
  const content = (
    <>
      <WhatsappLogo size={18} aria-hidden="true" />
      {label}
    </>
  );
  return href === '/contact' ? (
    // WhatsApp not configured: this goes to the contact page, so count it as a booking click.
    <Button to="/contact" variant="secondary" size={size} onClick={() => track('book_click', { page, via: 'contact' })}>
      {content}
    </Button>
  ) : (
    <Button href={href} variant="secondary" size={size} onClick={() => track('whatsapp_click', { page })}>
      {content}
    </Button>
  );
}
