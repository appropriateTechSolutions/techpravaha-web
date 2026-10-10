import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { List, WhatsappLogo, X } from '@phosphor-icons/react';
import { Lockup } from './Logo';
import { track } from '../lib/analytics';
import { pagePath } from '../lib/site';
import { waLink } from '../lib/whatsapp';
import { BookCallButton } from './BookCallButton';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/services', label: 'Services' },
  { to: '/work', label: 'Work' },
  { to: '/lab', label: 'Lab' },
  { to: '/journal', label: 'Journal' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
];

interface WhatsAppButtonProps {
  path: string;
  onNavigate?: () => void;
}

// External wa.me link when a number is configured; falls back to /contact otherwise.
function WhatsAppButton({ path, onNavigate }: WhatsAppButtonProps) {
  const page = pagePath(path);
  const href = waLink('Hi Tech Pravaha, I found you on ' + page);
  const content = (
    <>
      <WhatsappLogo size={18} aria-hidden />
      WhatsApp
    </>
  );
  if (href === '/contact') {
    // WhatsApp not configured: this goes to the contact page, so count it as a booking click.
    const onFallback = () => {
      track('book_click', { page, via: 'contact' });
      onNavigate?.();
    };
    return (
      <Link to={href} onClick={onFallback} className="btn btn-secondary min-h-11 px-4 text-sm">
        {content}
      </Link>
    );
  }
  const onClick = () => {
    track('whatsapp_click', { page });
    onNavigate?.();
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="btn btn-secondary min-h-11 px-4 text-sm"
    >
      {content}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

interface SiteHeaderProps {
  isLight: boolean;
  onToggleTheme: () => void;
}

export function SiteHeader({ isLight, onToggleTheme }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Return focus to the menu button whenever the menu closes (Escape, route change, button).
  useEffect(() => {
    if (wasOpen.current && !open) menuButtonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on route change. While open: lock body scroll (restoring whatever
  // was there before), close on Escape, and close when the viewport reaches lg,
  // where the menu button is hidden.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Not when something else already handled it, or when it only cancels an IME composition.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) setOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onDesktop = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center text-sm font-medium transition-colors ${
      isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-200 ${
        scrolled || open
          ? 'border-line bg-ground/80 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-6">
        <Link
          to="/"
          aria-label="Tech Pravaha, home"
          className="inline-flex min-h-11 shrink-0 items-center"
        >
          <Lockup />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle isLight={isLight} onToggle={onToggleTheme} />
          <WhatsAppButton path={location.pathname} />
          <BookCallButton page={location.pathname} compact className="min-h-11 px-4 text-sm" />
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <BookCallButton page={location.pathname} compact className="min-h-11 px-4 text-sm" />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
          >
            {open ? <X size={22} aria-hidden /> : <List size={22} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-ground lg:hidden"
        >
          <nav aria-label="Primary" className="flex flex-col px-6 py-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              <WhatsAppButton path={location.pathname} onNavigate={() => setOpen(false)} />
              <BookCallButton page={location.pathname} compact onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="label-mono">{isLight ? 'Light theme' : 'Dark theme'}</span>
              <ThemeToggle isLight={isLight} onToggle={onToggleTheme} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
