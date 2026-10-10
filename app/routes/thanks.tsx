import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle } from '@phosphor-icons/react';
import type { Route } from './+types/thanks';
import { track } from '../lib/analytics';
import { orderStatus, type OrderStatus } from '../lib/api';
import { catalogue, formatINR } from '../lib/catalogue';
import { useOrderParam } from '../lib/orderParam';
import { BOOKING_URL, HAS_BOOKING, pageMeta } from '../lib/site';
import { Eyebrow } from '../components/ui/Eyebrow';
import { WhatsAppCta } from '../components/WhatsAppCta';

export function meta(): Route.MetaDescriptors {
  return pageMeta({
    title: 'Thank you',
    description: 'Thanks from Tech Pravaha.',
    path: '/thanks',
    noindex: true,
  });
}

/** Poll every 2 s at first; after PENDING_MS show the pending copy and keep asking every 5 s. */
const POLL_MS = 2_000;
const PENDING_MS = 30_000;
const LATE_POLL_MS = 5_000;
/**
 * KV can take up to about a minute to show the webhook's "paid" write at the buyer's edge location
 * (the status route reads with a 30 s cacheTtl), so stop only after two minutes in total.
 */
const GIVE_UP_MS = 120_000;

type State =
  | { kind: 'checking' }
  | { kind: 'confirmed'; status: OrderStatus; tierId: string | undefined }
  | { kind: 'pending' };

/**
 * The Worker returns `tierId`. An older Worker did not, so fall back to looking the
 * service name and tier label up in the catalogue.
 */
function tierIdFor(status: OrderStatus): string | undefined {
  if (status.tierId) return status.tierId;
  const service = catalogue.services.find((s) => s.name === status.service);
  return service?.tiers.find((t) => t.label === status.tier)?.id;
}

/**
 * Sends `purchase` once per order in this browser tab and returns true if it did. A reload of /thanks
 * does not count the purchase twice: GA also dedupes on transaction_id, and the sessionStorage flag
 * keeps the event itself from firing. The flag is set only when gtag is loaded (analytics loads on
 * idle, so a fast first poll can beat it); otherwise nothing is sent and a later load can still report.
 * Storage blocked (private mode): fire anyway.
 */
function reportPurchase(orderId: string, params: Record<string, string | number>): boolean {
  if (typeof window.gtag !== 'function') return false;
  const key = `tp-purchase:${orderId}`;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // sessionStorage unavailable: fall back to the in-memory guard only
  }
  track('purchase', params);
  return true;
}

/**
 * Polls the Worker until the webhook has marked the order paid: every 2 s for 30 s, then (showing
 * the pending copy) every 5 s up to two minutes in total. A late "paid" still switches to confirmed.
 * Never reports "confirmed" on anything but `status === 'paid'`; a 404 or a network error just means
 * "ask again". Stops on unmount.
 */
function usePaymentStatus(orderId: string | undefined): State {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setState({ kind: 'checking' });
    let stopped = false;
    let late = false;
    let next: ReturnType<typeof setTimeout> | undefined;

    const pending = setTimeout(() => {
      if (stopped) return;
      late = true;
      setState({ kind: 'pending' });
    }, PENDING_MS);
    const stop = () => {
      stopped = true;
      clearTimeout(next);
      clearTimeout(pending);
      clearTimeout(giveUp);
    };
    // The pending copy stays; polling just ends.
    const giveUp = setTimeout(stop, GIVE_UP_MS);

    async function poll() {
      let res: OrderStatus | null = null;
      try {
        res = await orderStatus(orderId!);
      } catch {
        // offline or the Worker hiccuped: try again on the next tick
      }
      if (stopped) return;
      if (res?.status === 'paid') {
        stop();
        const tierId = tierIdFor(res);
        if (
          tracked.current !== orderId &&
          // value is what was charged now (the deposit for a part-paid tier), GST included.
          reportPurchase(orderId!, {
            transaction_id: orderId!,
            value: (res.amountPaise ?? 0) / 100,
            currency: 'INR',
            ...(tierId || res.tier ? { tier: tierId ?? res.tier! } : {}),
          })
        ) {
          tracked.current = orderId!;
        }
        setState({ kind: 'confirmed', status: res, tierId });
        return;
      }
      next = setTimeout(poll, late ? LATE_POLL_MS : POLL_MS);
    }
    void poll();

    return stop;
  }, [orderId]);

  return state;
}

const LINK = 'text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink';

function Confirmed({ orderId, status, tierId }: { orderId: string; status: OrderStatus; tierId: string | undefined }) {
  const intake = tierId ? `/contact/?order=${orderId}&tier=${tierId}` : `/contact/?order=${orderId}`;
  const what = [status.service, status.tier].filter(Boolean).join(' · ');
  // Rupees still due at launch for a part-paid (deposit) order; 0 when paid in full or on an older Worker.
  const balance =
    typeof status.amountPaise === 'number' && typeof status.totalPaise === 'number' && (status.depositPct ?? 100) < 100
      ? Math.max(0, Math.round((status.totalPaise - status.amountPaise) / 100))
      : 0;
  return (
    <>
      <div className="card mt-10 max-w-[640px] p-6 md:p-8">
        <p className="label-mono">Order</p>
        {/* Razorpay ids are case-sensitive, so the id is not set in the uppercase label style. */}
        <p className="mt-2 font-mono text-sm break-all text-ink">{orderId}</p>
        {what && <p className="mt-3 text-ink">{what}</p>}
        {typeof status.amountPaise === 'number' &&
          (balance > 0 ? (
            <>
              <p className="mt-1 text-ink-2 tabular-nums">
                {formatINR(status.amountPaise / 100)} paid ({status.depositPct}% deposit), GST included
              </p>
              <p className="mt-1 text-ink-2 tabular-nums">Balance at launch: {formatINR(balance)}</p>
            </>
          ) : (
            <p className="mt-1 text-ink-2 tabular-nums">{formatINR(status.amountPaise / 100)} paid, GST included</p>
          ))}
      </div>

      <h2 className="display-3 mt-16">What happens next.</h2>
      <ol className="mt-8 grid max-w-[640px] gap-6">
        <li className="flex gap-4">
          <span className="label-mono pt-1">01</span>
          <p className="text-ink-2">
            Send us your details and references through the{' '}
            <Link to={intake} className={LINK}>
              intake form
            </Link>
            . Your goal, your audience and what you already have.
          </p>
        </li>
        <li className="flex gap-4">
          <span className="label-mono pt-1">02</span>
          <p className="text-ink-2">
            {HAS_BOOKING ? (
              <>
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                  Book your kickoff call
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </>
            ) : (
              'We message you to book the kickoff call.'
            )}{' '}
            We confirm the scope, the launch date and what we need from you. Your timeline starts there.
          </p>
        </li>
        <li className="flex gap-4">
          <span className="label-mono pt-1">03</span>
          <div className="text-ink-2">
            <p>Questions before then? Message us on WhatsApp with your order id.</p>
            <div className="mt-4">
              <WhatsAppCta message={`Hi Tech Pravaha, a question about order ${orderId}.`} page="/thanks" />
            </div>
          </div>
        </li>
      </ol>
    </>
  );
}

export default function ThanksPage() {
  const orderId = useOrderParam();
  const state = usePaymentStatus(orderId);
  const kind = orderId ? state.kind : 'generic';

  const line =
    kind === 'generic'
      ? 'If you just paid, your receipt is on its way to your email. If you sent a message, we reply within one working day.'
      : kind === 'checking'
        ? 'Confirming your payment…'
        : kind === 'confirmed'
          ? 'Payment confirmed. Your receipt is on its way to your email.'
          : `Razorpay has your payment. Your receipt is on its way. If it does not arrive in 10 minutes, message us on WhatsApp with order ${orderId}.`;

  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-32 pb-24 md:pt-40 md:pb-28">
      <div className="max-w-[880px]">
        <Eyebrow dot className="mb-8">
          {orderId ? 'Order' : 'Thanks'}
        </Eyebrow>
        <h1 className="display-2">Thank you.</h1>

        {/* Live region mounted from the start so each state change is announced. */}
        <div role="status" className="mt-8 flex max-w-[60ch] items-start gap-3">
          {kind === 'confirmed' && (
            <CheckCircle size={24} weight="fill" aria-hidden="true" className="mt-1 shrink-0 text-accent" />
          )}
          {kind === 'checking' && (
            <span aria-hidden="true" className="mt-3 size-2 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
          )}
          <p className="text-[19px] leading-relaxed text-ink-2">{line}</p>
        </div>

        {kind === 'confirmed' && state.kind === 'confirmed' && orderId && (
          <Confirmed orderId={orderId} status={state.status} tierId={state.tierId} />
        )}

        {kind === 'pending' && orderId && (
          <div className="mt-8">
            <WhatsAppCta
              message={`Hi Tech Pravaha, I paid for order ${orderId} and have not received a receipt.`}
              page="/thanks"
            />
          </div>
        )}

        {kind === 'generic' && (
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/" className="btn btn-secondary">
              Back to home
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
