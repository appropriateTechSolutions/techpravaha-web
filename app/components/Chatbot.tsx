import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { PaperPlaneRight, X } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import {
  BAD_REQUEST_TEXT,
  loadTranscript,
  MAX_INPUT,
  OUTAGE_TEXT,
  saveTranscript,
  sendChat,
  transcriptToSend,
  type ChatMessage,
} from '../lib/chat';
import { ApiError } from '../lib/api';
import { EASE_OUT_EXPO } from '../lib/motion';
import { AssistantText } from './chat/AssistantText';
import { HumanLink } from './chat/HumanLink';
import { TypingDots } from './chat/TypingDots';
import { Mark } from './Logo';

const QUICK_REPLIES = ['What does a landing page cost?', 'How fast can you ship an app?'];
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled])';
const COUNTER_FROM = Math.round(MAX_INPUT * 0.8);
const SMALL_SCREEN = '(max-width: 639px)';
const fmt = new Intl.NumberFormat('en-IN');

export interface ChatbotProps {
  id: string;
  open: boolean;
  /** Close the panel; `returnFocus` false when a link inside it is navigating away. */
  onClose: (returnFocus?: boolean) => void;
}

/**
 * The site assistant panel (lazy chunk, see ChatLauncher). Stays mounted after first use so a
 * reply that lands while it is closed is there on reopen. Transcript in localStorage `tp-chat`.
 */
export default function Chatbot({ id, open, onClose }: ChatbotProps) {
  const reduce = useReducedMotion() === true;
  const [messages, setMessages] = useState<ChatMessage[]>(loadTranscript);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => saveTranscript(messages), [messages]);
  useEffect(() => () => inflight.current?.abort(), []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes from anywhere on the page while the panel is open, not only from inside it. Not when
  // something else already handled it, or when it only cancels an IME composition.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, open]);

  // Grow the textarea with its content, up to about five lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    if (el.scrollHeight > 0) el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input, open]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    inputRef.current?.focus();
    track('chat_send');

    const ctrl = new AbortController();
    inflight.current = ctrl;
    let reply: ChatMessage;
    try {
      const res = await sendChat(transcriptToSend(next), ctrl.signal);
      reply = { role: 'assistant', content: res.reply, ...(res.status === 200 ? {} : { notice: true }) };
    } catch (err) {
      if (ctrl.signal.aborted) return; // unmounted
      const content = err instanceof ApiError && err.status === 400 ? BAD_REQUEST_TEXT : OUTAGE_TEXT;
      reply = { role: 'assistant', content, notice: true };
    }
    inflight.current = null;
    setMessages((prev) => [...prev, reply]);
    setSending(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  // Tab and Shift+Tab cycle inside the panel (Escape is handled at document level above).
  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // On a phone the sheet covers the page a link opens, so close it (the transcript stays).
  const onNavigate = () => {
    if (window.matchMedia?.(SMALL_SCREEN).matches) onClose(false);
  };

  const clear = () => {
    inflight.current?.abort();
    inflight.current = null;
    setSending(false);
    setMessages([]);
    inputRef.current?.focus();
  };

  const empty = messages.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-modal="true"
          aria-label="Tech Pravaha assistant"
          onKeyDown={onPanelKeyDown}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 12 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT_EXPO }}
          className="fixed inset-x-0 bottom-0 flex h-[min(560px,85dvh)] flex-col overflow-hidden rounded-t-2xl border-t border-line-strong bg-surface text-[15px] sm:static sm:h-[min(560px,calc(100dvh-var(--tp-notice-h,0px)-8rem))] sm:w-[380px] sm:rounded-2xl sm:border"
        >
          <div className="flex items-center gap-2.5 border-b border-line py-1.5 pr-1.5 pl-4">
            <Mark size={22} className="text-ink" />
            <p className="flex-1 font-display text-base font-semibold tracking-[-0.01em] text-ink">
              Tech Pravaha assistant
            </p>
            {!empty && (
              <button
                type="button"
                onClick={clear}
                className="min-h-11 px-2 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Clear chat
              </button>
            )}
            <button
              type="button"
              onClick={() => onClose()}
              aria-label="Close chat"
              className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-ground hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Clarity masks this subtree in session recordings: chat messages are rendered as page text. */}
          <div ref={scrollRef} data-clarity-mask="True" className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {empty && (
              <p className="mb-4 text-ink-2">
                Ask about our services, prices or timelines. Answers come from our catalogue.
              </p>
            )}
            <div role="log" aria-label="Conversation" className="flex flex-col gap-4">
              {messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <p
                    key={i}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-ground px-3.5 py-2.5 break-words whitespace-pre-wrap text-ink"
                  >
                    <span className="sr-only">You: </span>
                    {msg.content}
                  </p>
                ) : (
                  <div key={i} className="max-w-[92%] leading-relaxed text-ink-2">
                    <p className="break-words whitespace-pre-wrap">
                      <span className="sr-only">Assistant: </span>
                      <AssistantText text={msg.content} onNavigate={onNavigate} />
                    </p>
                    {msg.notice && (
                      <p className="mt-2 text-sm">
                        <HumanLink onNavigate={onNavigate} />
                      </p>
                    )}
                  </div>
                ),
              )}
              {sending && <TypingDots reduce={reduce} />}
            </div>
            {empty && (
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="min-h-11 rounded-full border border-line-strong px-4 text-left text-sm text-ink transition-colors hover:border-ink"
                  >
                    {q}
                  </button>
                ))}
                <HumanLink
                  onNavigate={onNavigate}
                  className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-ink transition-colors hover:border-ink">
                  Talk to a human
                </HumanLink>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-line px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2">
              <label htmlFor={`${id}-input`} className="sr-only">
                Message
              </label>
              <textarea
                id={`${id}-input`}
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_INPUT}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                onKeyDown={onInputKeyDown}
                aria-describedby={input.length >= COUNTER_FROM ? `${id}-count` : undefined}
                placeholder="Ask a question"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-ground px-3.5 py-2.5 leading-snug text-ink transition-colors placeholder:text-muted-2 focus:border-ink"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim() || sending}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-ground transition-colors hover:bg-ink-2 disabled:opacity-40 disabled:hover:bg-ink"
              >
                <PaperPlaneRight size={18} weight="fill" aria-hidden="true" />
              </button>
            </div>
            {input.length >= COUNTER_FROM && (
              <p id={`${id}-count`} className="mt-1.5 text-right font-mono text-xs text-muted">
                {fmt.format(input.length)} / {fmt.format(MAX_INPUT)}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Prices from our catalogue; a human confirms everything. <HumanLink onNavigate={onNavigate} />
            </p>
          </form>
        </m.div>
      )}
    </AnimatePresence>
  );
}
