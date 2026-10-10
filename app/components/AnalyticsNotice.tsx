import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { m, useReducedMotion } from 'motion/react';
import { analyticsTools, loadAnalytics } from '../lib/analytics';
import { whenIdle } from '../lib/idle';
import { EASE_OUT_EXPO, useHydrated } from '../lib/motion';

export const NOTICE_KEY = 'tp-notice';
/** CSS variable holding the notice's height while it shows; the chat launcher sits above it. */
export const NOTICE_HEIGHT_VAR = '--tp-notice-h';

function readSeen(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSeen(): void {
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    // storage blocked: the notice simply shows again next visit
  }
}

/**
 * One-line, non-blocking analytics notice (spec §6) pinned to the bottom of the
 * viewport. It renders only after hydration and only until the visitor presses OK.
 * GA4 and Clarity load from here, on idle, once the notice has had its chance to
 * render, so analytics never load ahead of it. A visitor who already pressed OK
 * gets no notice and analytics load on idle as before.
 */
export function AnalyticsNotice() {
  const hydrated = useHydrated();
  const reduce = useReducedMotion() === true;
  const [dismissed, setDismissed] = useState(false);
  const visible = hydrated && !dismissed && !readSeen();
  const ref = useRef<HTMLDivElement>(null);

  // Runs after the commit that first renders the notice (or skips it when seen).
  useEffect(() => {
    if (!hydrated) return;
    return whenIdle(loadAnalytics);
  }, [hydrated]);

  // Publish the notice's height so other fixed bottom UI (ChatLauncher) can clear it, and so focus
  // scrolling and anchor jumps (scroll-padding-bottom) never leave a field hidden behind the notice.
  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const root = document.documentElement.style;
    const publish = () => root.setProperty(NOTICE_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    root.setProperty('scroll-padding-bottom', `var(${NOTICE_HEIGHT_VAR})`);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.removeProperty(NOTICE_HEIGHT_VAR);
      root.removeProperty('scroll-padding-bottom');
    };
  }, [visible]);

  if (!visible) return null;

  // Name the tools only when their ids are real; a placeholder build loads nothing it could name.
  const tools = analyticsTools();
  const line = tools.length
    ? `We use ${tools.join(' and ')} to see how the site is used.`
    : 'We use analytics to see how the site is used.';

  const dismiss = () => {
    writeSeen();
    setDismissed(true);
  };

  return (
    <m.div
      ref={ref}
      role="region"
      aria-label="Analytics notice"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT_EXPO }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 print:hidden"
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 rounded-2xl border border-line-strong bg-surface py-1 pr-1 pl-4 text-sm text-ink-2">
        <p className="py-2">{line}</p>
        <span className="flex items-center gap-1">
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center px-2 text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
          >
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-semibold text-ink transition-colors hover:bg-ground"
          >
            OK
          </button>
        </span>
      </div>
    </m.div>
  );
}
