import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import type { ChatbotProps } from '../Chatbot';
import { HumanLink } from './HumanLink';

/**
 * Stands in for the Chatbot when its chunk fails to load (offline, deploy swapped the
 * hashes). Same dialog contract as the panel, so the launcher keeps working; no route error.
 * `onRetry` (from ChatLauncher) loads the chunk again; on success the real panel replaces this.
 */
export function ChatUnavailable({ id, open, onClose, onRetry }: ChatbotProps & { onRetry?: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Not when something else already handled it, or when it only cancels an IME composition.
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Tech Pravaha assistant"
      className="fixed inset-x-0 bottom-0 flex items-start gap-3 rounded-t-2xl border-t border-line-strong bg-surface py-3 pr-2 pl-4 text-[15px] text-ink-2 sm:static sm:w-[380px] sm:rounded-2xl sm:border"
    >
      <p className="flex-1 py-2.5">
        The chat could not load.{' '}
        {onRetry && (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Try again
            </button>{' '}
            or{' '}
          </>
        )}
        <HumanLink onNavigate={() => onClose(false)} />
      </p>
      <button
        ref={closeRef}
        type="button"
        onClick={() => onClose()}
        aria-label="Close chat"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-ground hover:text-ink"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
