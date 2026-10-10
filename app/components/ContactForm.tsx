import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useSearchParams } from 'react-router';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { getTier, type Service, type Tier } from '../lib/catalogue';
import { useHydrated } from '../lib/motion';
import { useOrderParam } from '../lib/orderParam';
import { CONTACT_EMAIL, pagePath } from '../lib/site';
import { WHATSAPP_NUMBER, waLink } from '../lib/whatsapp';
import { submitLead } from '../services/leads';
import { FieldError, FormField, INPUT_CLASS } from './ui/FormField';

/**
 * The package named by `?tier=<tierId>`, or undefined. Prerendered HTML has no
 * query string, so this stays undefined until hydration finishes; the tier then
 * fills in on the next render instead of mismatching the server markup.
 */
export function useQuotedTier(): { service: Service; tier: Tier } | undefined {
  const [params] = useSearchParams();
  const hydrated = useHydrated();
  const id = hydrated ? params.get('tier') : null;
  return id ? getTier(id) : undefined;
}

/** "Websites & landing pages · Launch" */
export function tierName(picked: { service: Service; tier: Tier }): string {
  return `${picked.service.name} · ${picked.tier.label}`;
}

type Field = 'name' | 'email' | 'phone' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'failed';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = 'Add your name.';
  if (!v.email.trim()) errors.email = 'Add your email.';
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'That email does not look right.';
  const digits = v.phone.replace(/\D/g, '');
  if (v.phone.trim() && (digits.length < 10 || digits.length > 15)) {
    errors.phone = 'That phone number does not look right.';
  }
  if (!v.message.trim()) errors.message = 'Add a short message.';
  return errors;
}

export function ContactForm() {
  const picked = useQuotedTier();
  const orderId = useOrderParam();
  const pathname = pagePath(useLocation().pathname);
  const uid = useId();
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const statusRef = useRef<HTMLDivElement>(null);

  // Move focus to the thank-you message so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (status === 'sent') statusRef.current?.focus();
  }, [status]);

  // Prefill the message once the order or tier is known, without overwriting anything typed.
  // A paid order (from the /thanks intake link) wins; its tier still rides along in `tier`.
  const prefill = orderId
    ? `Order ${orderId}: here are my details and references.`
    : picked
      ? `I'd like a quote for ${tierName(picked)}.`
      : '';
  useEffect(() => {
    if (prefill) setValues((v) => (v.message.trim() === '' ? { ...v, message: prefill } : v));
  }, [prefill]);

  const set = (field: Field) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const found = validate(values);
    // Commit aria-invalid and the error text before focus moves, so the field is announced with its error.
    flushSync(() => setErrors(found));
    const first = (['name', 'email', 'phone', 'message'] as const).find((f) => found[f]);
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }

    setStatus('sending');
    const tier = picked?.tier.id;
    const { ok } = await submitLead({
      name: values.name.trim(),
      email: values.email.trim(),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      message: values.message.trim(),
      ...(tier ? { tier } : {}),
      page: pathname,
      type: 'contact',
    });
    if (ok) {
      track('lead_submit', tier ? { page: pathname, tier } : { page: pathname });
      setStatus('sent');
    } else {
      setStatus('failed');
    }
  }

  const sending = status === 'sending';
  const fallbackMessage = `Hi Tech Pravaha, the form on your website didn't send. ${values.message.trim()}`.trim();

  const field = (name: Field, label: string, extra: { type?: string; autoComplete?: string; optional?: boolean }) => (
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

  const messageId = `${uid}-message`;
  const sent = status === 'sent';
  return (
    <>
      {/* Live region mounted from the start so screen readers announce the text when it arrives. */}
      <div
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={sent ? 'card flex items-start gap-4 p-8 outline-none' : 'sr-only'}
      >
        {sent && (
          <>
            <CheckCircle size={24} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[19px] leading-relaxed text-ink">Thanks. We reply within one working day.</p>
          </>
        )}
      </div>
      {!sent && (
        <form noValidate onSubmit={onSubmit} aria-label="Contact form" className="grid gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {field('name', 'Name', { autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          </div>
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', optional: true })}
          <div>
            <label htmlFor={messageId} className="mb-2 block text-sm font-medium text-ink">
              Message
            </label>
            <textarea
              id={messageId}
              name="message"
              rows={6}
              value={values.message}
              onChange={set('message')}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? `${messageId}-error` : undefined}
              placeholder="What do you want to launch, and by when?"
              className={`${INPUT_CLASS} resize-y`}
            />
            {errors.message && <FieldError id={`${messageId}-error`}>{errors.message}</FieldError>}
          </div>
          <input type="hidden" name="tier" value={picked?.tier.id ?? ''} />

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={sending} className="btn btn-primary min-h-14 px-7 text-base disabled:opacity-60">
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>

          {status === 'failed' && (
            <div role="alert" className="card p-6">
              <p className="text-ink">Message didn't send.</p>
              <p className="mt-2 text-ink-2">
                {WHATSAPP_NUMBER ? (
                  <a
                    href={waLink(fallbackMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('whatsapp_click', { page: pathname })}
                    className="inline-flex items-center gap-1.5 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                  >
                    WhatsApp us instead
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
                {WHATSAPP_NUMBER ? ', or email ' : 'Email us at '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          )}
        </form>
      )}
    </>
  );
}
