import { Link } from 'react-router';
import { CalendarBlank } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { BOOKING_URL, HAS_BOOKING, pagePath } from '../lib/site';
import { Button } from './ui/Button';

interface BookCallButtonProps {
  /** Page path for analytics, e.g. '/services/apps'. Trailing slashes are ignored. */
  page: string;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  /** Header style: a plain compact link instead of the magnetic Button. */
  compact?: boolean;
  /** Show the calendar icon (contact page). */
  icon?: boolean;
  className?: string;
  /** Called on click, e.g. to close the mobile menu. */
  onNavigate?: () => void;
}

/**
 * The one "book a call" control. With VITE_BOOKING_URL set to an external page it
 * opens that page in a new tab and records `book_click { page }`. Unset, it reads
 * "Talk to us" and links to /contact with no event, and renders nothing on /contact
 * itself (a link to the page you are on helps no one).
 */
export function BookCallButton({
  page,
  variant = 'primary',
  size,
  compact = false,
  icon = false,
  className = '',
  onNavigate,
}: BookCallButtonProps) {
  const path = pagePath(page);

  if (!HAS_BOOKING) {
    if (path === '/contact') return null;
    if (compact) {
      return (
        <Link to="/contact" onClick={onNavigate} className={`btn btn-${variant} ${className}`.trim()}>
          Talk to us
        </Link>
      );
    }
    return (
      <Button to="/contact" variant={variant} size={size} onClick={onNavigate} className={className}>
        Talk to us
      </Button>
    );
  }

  const onClick = () => {
    track('book_click', { page: path });
    onNavigate?.();
  };
  const content = (
    <>
      {icon && <CalendarBlank size={18} aria-hidden="true" />}
      Book a call
    </>
  );

  if (compact) {
    return (
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`btn btn-${variant} ${className}`.trim()}
      >
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  // Button renders an external href as target="_blank" with the sr-only new-tab hint.
  return (
    <Button href={BOOKING_URL} variant={variant} size={size} onClick={onClick} className={className}>
      {content}
    </Button>
  );
}
