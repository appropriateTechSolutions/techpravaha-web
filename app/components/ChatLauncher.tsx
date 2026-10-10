import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { useLocation } from 'react-router';
import { ChatCircleDots, X } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { whenIdle } from '../lib/idle';
import { useHydrated } from '../lib/motion';
import type { ChatbotProps } from './Chatbot';
import { ChatUnavailable } from './chat/ChatUnavailable';
import { loadChatbot } from './chat/loadChatbot';

// The panel, its client and the linkifier live in their own chunk, fetched on first hover,
// focus or click of the launcher; nothing of it ships with the page.
// A failed chunk load (offline, a deploy swapped the hashes) shows ChatUnavailable instead of
// throwing into the route error UI. React.lazy caches whatever its first load returned, so
// "Try again" builds a fresh lazy component that calls the loader again.
function lazyChatbot(retry: () => void) {
  return lazy(async (): Promise<{ default: ComponentType<ChatbotProps> }> => {
    try {
      return await loadChatbot();
    } catch {
      return { default: (props: ChatbotProps) => <ChatUnavailable {...props} onRetry={retry} /> };
    }
  });
}
const prefetch = () => void loadChatbot().catch(() => {});

export const CHAT_PANEL_ID = 'tp-chat-panel';
const OPENED_KEY = 'tp-chat-opened';

// Buyers mid-checkout and on the receipt page stay focused: no launcher there.
const HIDDEN = /^\/(checkout(\/|$)|thanks\/?$)/;

/** chat_open once per browser session (module flag when sessionStorage is blocked). */
let openedThisLoad = false;
function trackFirstOpen(): void {
  let seen: boolean;
  try {
    seen = sessionStorage.getItem(OPENED_KEY) === '1';
    sessionStorage.setItem(OPENED_KEY, '1');
  } catch {
    // storage blocked: one per page load instead
    seen = openedThisLoad;
    openedThisLoad = true;
  }
  if (!seen) track('chat_open');
}

/**
 * Floating 56px chat button, bottom right, lifted above the AnalyticsNotice while that shows
 * (the notice publishes its height as --tp-notice-h). It mounts after hydration and an idle
 * callback, never opens by itself, and loads the Chatbot chunk only when first used.
 */
export function ChatLauncher() {
  const hydrated = useHydrated();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  // A new lazy component per attempt; setChatbot is stable, so any retry closure stays valid.
  const [Chatbot, setChatbot] = useState(() => lazyChatbot(retry));
  function retry() {
    setChatbot(() => lazyChatbot(retry));
  }
  const buttonRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const { pathname } = useLocation();
  const hidden = HIDDEN.test(pathname);

  useEffect(() => {
    if (!hydrated) return;
    return whenIdle(() => setReady(true));
  }, [hydrated]);

  // Close on the way into checkout or thanks so the panel is not waiting when the buyer leaves.
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  // Focus goes back to the launcher once the panel has closed (Escape, close button).
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  const close = useCallback((returnFocus = true) => {
    refocus.current = returnFocus;
    setOpen(false);
  }, []);

  if (!ready || hidden) return null;

  const toggle = () => {
    if (!open) trackFirstOpen();
    setUsed(true);
    setOpen((o) => !o);
  };

  return (
    <div className="fixed right-4 bottom-[calc(var(--tp-notice-h,0px)+1rem)] z-[60] flex flex-col items-end gap-3 transition-[bottom] duration-200 ease-[var(--ease-out-expo)] sm:right-6 sm:bottom-[calc(var(--tp-notice-h,0px)+1.5rem)] print:hidden">
      {used && (
        <Suspense fallback={null}>
          <Chatbot id={CHAT_PANEL_ID} open={open} onClose={close} />
        </Suspense>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-label="Chat with Tech Pravaha"
        aria-expanded={open}
        aria-controls={CHAT_PANEL_ID}
        className="flex size-14 items-center justify-center rounded-full border border-line-strong bg-ink text-ground transition-colors hover:bg-ink-2"
      >
        {open ? (
          <X size={22} weight="bold" aria-hidden="true" />
        ) : (
          <ChatCircleDots size={26} weight="fill" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
