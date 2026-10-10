import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router';
import { LockSimple } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { ApiError, createOrder, type CreateOrderResponse, type Customer } from '../lib/api';
import { chargedNow, formatINR, type Service, type Tier } from '../lib/catalogue';
import { RAZORPAY_THEME_COLOR, loadCheckout, paymentsEnabled } from '../lib/razorpay';
import { pagePath } from '../lib/site';
import {
  COMPANY_MAX,
  CONTROL_RE,
  EMAIL_MAX,
  EMAIL_RE,
  GSTIN_RE,
  HIDDEN_CHAR_HINT,
  NAME_MAX,
  NAME_MIN,
  ORDER_PHONE_RE,
} from '../lib/validation';
import { tierMessage } from '../lib/whatsapp';
import { FormField } from './ui/FormField';
import { WhatsAppCta } from './WhatsAppCta';

type Field = 'name' | 'email' | 'phone' | 'company' | 'gstin';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
/** idle → creating (order + Checkout.js) → open (Razorpay window up) → idle again, or failed. */
type Status = 'idle' | 'creating' | 'open' | 'failed';

const FIELDS: Field[] = ['name', 'email', 'phone', 'company', 'gstin'];

// The rules mirror the Worker's validateOrderBody (app/lib/validation.ts; tests/validation-parity.test.ts
// keeps them in step), so anything this form accepts the Worker accepts too and a 400 never surprises the buyer.
const HIDDEN = HIDDEN_CHAR_HINT;

const MESSAGES: Record<Field, string> = {
  name: 'Add your name.',
  email: 'That email does not look right.',
  phone: 'Use a 10-digit Indian mobile number.',
  company: `Keep the company name under ${COMPANY_MAX} characters.`,
  gstin: 'That GSTIN does not look right. It has 15 characters, like 27ABCDE1234F1Z5.',
};

export function validateCheckout(v: Values): Errors {
  const errors: Errors = {};
  const name = v.name.trim();
  if (CONTROL_RE.test(name)) errors.name = `That name does not look right. ${HIDDEN}`;
  else if (name.length < NAME_MIN) errors.name = MESSAGES.name;
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;
  const email = v.email.trim();
  if (!email) errors.email = 'Add your email. The receipt goes there.';
  else if (CONTROL_RE.test(email)) errors.email = `${MESSAGES.email} ${HIDDEN}`;
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.email = MESSAGES.email;
  if (!v.phone.trim()) errors.phone = 'Add your mobile number.';
  else if (!ORDER_PHONE_RE.test(v.phone.replace(/[\s-]/g, ''))) errors.phone = MESSAGES.phone;
  const company = v.company.trim();
  if (CONTROL_RE.test(company)) errors.company = `That company name does not look right. ${HIDDEN}`;
  else if (company.length > COMPANY_MAX) errors.company = MESSAGES.company;
  const gstin = v.gstin.trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) errors.gstin = MESSAGES.gstin;
  return errors;
}

/** Worker field names (`customer.phone`) or bare ones (`phone`) to form fields. */
function fieldErrors(fields: string[]): Errors {
  const errors: Errors = {};
  for (const f of fields) {
    const key = f.replace(/^customer\./, '') as Field;
    if (FIELDS.includes(key)) errors[key] = MESSAGES[key];
  }
  return errors;
}

const LINK = 'text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink';

interface CheckoutFormProps {
  service: Service;
  /** A buyable tier. The Pay button shows chargedNow(tier); the Worker sets the order amount. */
  tier: Tier & { price: number };
}

/** Customer details and the Pay button. Opens Razorpay Checkout for an order the Worker creates. */
export function CheckoutForm({ service, tier }: CheckoutFormProps) {
  const navigate = useNavigate();
  const page = pagePath(useLocation().pathname);
  const uid = useId();
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '', company: '', gstin: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  // Set when the Worker's amount differs from this page's: the alert then says the price changed and points to WhatsApp.
  const [mismatch, setMismatch] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const payRef = useRef<HTMLButtonElement>(null);
  // Synchronous guard: two taps in the same frame both see the old `status`.
  const busyRef = useRef(false);
  // The Worker order for these exact details, reused when Checkout.js failed to load or the
  // buyer closed the Razorpay window, so a retry does not create a second order.
  const orderRef = useRef<{ key: string; order: CreateOrderResponse } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const enabled = paymentsEnabled();
  const what = `${service.name} · ${tier.label}`;
  const charged = chargedNow(tier);
  const chargedText = formatINR(charged);

  const set = (field: Field) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  /** Commit the errors before focus moves, so the field is announced with its message. */
  function showErrors(found: Errors): boolean {
    flushSync(() => setErrors(found));
    const first = FIELDS.find((f) => found[f]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
    return Boolean(first);
  }

  function fail(amountMismatch = false) {
    busyRef.current = false;
    if (!mounted.current) return;
    flushSync(() => {
      setMismatch(amountMismatch);
      setStatus('failed');
    });
    alertRef.current?.focus();
  }

  /** Back to idle with focus on Pay, so keyboard and screen-reader users are not dropped on <body>. */
  function reset() {
    busyRef.current = false;
    if (!mounted.current) return;
    flushSync(() => setStatus('idle'));
    payRef.current?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current) return;
    if (showErrors(validateCheckout(values))) return;

    busyRef.current = true;
    track('begin_checkout', { tier: tier.id, from: 'pay' });
    setStatus('creating');

    const customer: Customer = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      ...(values.company.trim() ? { company: values.company.trim() } : {}),
      ...(values.gstin.trim() ? { gstin: values.gstin.trim().toUpperCase() } : {}),
    };

    const key = JSON.stringify([tier.id, customer]);
    let order = orderRef.current?.key === key ? orderRef.current.order : undefined;
    if (!order) {
      try {
        order = await createOrder({ tierId: tier.id, customer, page });
        orderRef.current = { key, order };
      } catch (err) {
        if (!mounted.current) return;
        const inline = err instanceof ApiError && err.status === 400 ? fieldErrors(err.fields) : {};
        if (Object.keys(inline).length) {
          busyRef.current = false;
          setStatus('idle');
          showErrors(inline);
        } else {
          fail();
        }
        return;
      }
    }

    // The Worker bundles catalogue.json at deploy time, the site at build time. If they disagree (a price
    // edit merged without a Worker redeploy), never open Razorpay for an amount this page did not show.
    if (order.amount !== charged * 100 || order.currency !== 'INR') {
      orderRef.current = null;
      track('checkout_mismatch', { tier: tier.id });
      fail(true);
      return;
    }

    try {
      const Razorpay = await loadCheckout();
      if (!mounted.current) {
        busyRef.current = false;
        return;
      }
      const orderId = order.orderId;
      new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: orderId,
        name: 'Tech Pravaha',
        description: `${order.service?.name ?? service.name} · ${order.tier?.label ?? tier.label}`,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        theme: { color: RAZORPAY_THEME_COLOR },
        handler: () => {
          void navigate(`/thanks?order=${encodeURIComponent(orderId)}`);
        },
        modal: { ondismiss: reset },
      }).open();
      setStatus('open');
    } catch {
      fail();
    }
  }

  const field = (
    name: Field,
    label: string,
    extra: { type?: string; autoComplete?: string; inputMode?: 'tel' | 'email'; optional?: boolean; hint?: string },
  ) => (
    <FormField
      id={`${uid}-${name}`}
      name={name}
      label={label}
      value={values[name]}
      onChange={set(name)}
      error={errors[name]}
      {...extra}
    />
  );

  const busy = status === 'creating' || status === 'open';
  const label = status === 'creating' ? 'Opening secure checkout…' : status === 'open' ? 'Waiting for payment…' : `Pay ${chargedText}`;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Checkout" className="grid gap-6">
      {!enabled && (
        <div className="card p-6">
          <p className="text-ink">Online payment is not switched on yet.</p>
          <p className="mt-2 text-ink-2">Message us on WhatsApp and we will send you a payment link for {what}.</p>
          <div className="mt-5">
            <WhatsAppCta message={tierMessage(service.name, tier.label, tier.price)} page={page} />
          </div>
        </div>
      )}

      <fieldset disabled={!enabled} className="grid gap-6">
        <legend className="sr-only">Your details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          {field('name', 'Name', { autoComplete: 'name' })}
          {field('email', 'Email', { type: 'email', inputMode: 'email', autoComplete: 'email', hint: 'The receipt goes here.' })}
        </div>
        {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', hint: '10-digit Indian mobile number.' })}
        <div className="grid gap-6 sm:grid-cols-2">
          {field('company', 'Company', { autoComplete: 'organization', optional: true })}
          {field('gstin', 'GSTIN', { optional: true, hint: 'Add it if you want it on the invoice.' })}
        </div>
      </fieldset>

      {enabled && (
        <div className="grid gap-4">
          <p className="text-sm text-ink-2">
            By paying you agree to the{' '}
            <Link to="/terms" className={LINK}>
              Terms
            </Link>{' '}
            and the{' '}
            <Link to="/refunds" className={LINK}>
              Refund policy
            </Link>
            .
          </p>
          {/* aria-disabled, not disabled, while busy: the button keeps focus and stays in the tab order. */}
          <button
            ref={payRef}
            type="submit"
            aria-disabled={busy || undefined}
            className="btn btn-primary min-h-14 w-full px-7 text-base tabular-nums aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto sm:justify-self-start"
          >
            {label}
          </button>
          {/* Mounted from the start so screen readers announce each busy step. */}
          <p role="status" className="sr-only">
            {busy ? label : ''}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted">
            <LockSimple size={16} weight="bold" aria-hidden="true" className="shrink-0" />
            Paid through Razorpay: UPI, card or netbanking. We never see your card details.
          </p>
        </div>
      )}

      {status === 'failed' && (
        <div ref={alertRef} role="alert" tabIndex={-1} className="card p-6 outline-none">
          <p className="text-ink">Checkout did not open. Nothing was charged.</p>
          <p className="mt-2 text-ink-2">
            {mismatch
              ? 'This price was just updated on our side. Message us on WhatsApp and we will send you a payment link.'
              : 'Try again, or message us on WhatsApp and we will help you finish.'}
          </p>
          <div className="mt-5">
            <WhatsAppCta message={`Hi Tech Pravaha, I tried to buy ${what} and checkout failed.`} page={page} />
          </div>
        </div>
      )}
    </form>
  );
}
