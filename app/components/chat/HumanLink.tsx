import { Link } from 'react-router';
import { track } from '../../lib/analytics';
import { waLink } from '../../lib/whatsapp';

/** Prefilled WhatsApp text for every "talk to a human" path in the chat. */
export const HUMAN_MESSAGE = 'Hi Tech Pravaha, I was chatting on your site and want to talk to a person.';

export const LINK_CLASS =
  'text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink';

interface HumanLinkProps {
  children?: string;
  className?: string;
  /** Called when the /contact fallback navigates in this tab (the mobile sheet closes). */
  onNavigate?: () => void;
}

/**
 * WhatsApp with a prefilled line, or /contact while the number is unset. Lives outside the
 * Chatbot chunk so the "chat could not load" fallback can use it too.
 */
export function HumanLink({ children, className = LINK_CLASS, onNavigate }: HumanLinkProps) {
  const href = waLink(HUMAN_MESSAGE);
  if (href === '/contact') {
    return (
      <Link
        to="/contact"
        className={className}
        onClick={() => {
          track('book_click', { page: 'chat', via: 'contact' });
          onNavigate?.();
        }}
      >
        {children ?? 'Contact us'}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track('whatsapp_click', { page: 'chat' })}
    >
      {children ?? 'Message on WhatsApp'}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
