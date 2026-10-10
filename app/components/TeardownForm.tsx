import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import {
  CONTROL_RE,
  EMAIL_MAX,
  EMAIL_RE,
  HIDDEN_CHAR_HINT,
  NAME_MAX,
  NAME_MIN,
  URL_MAX,
  URL_RE,
  phoneOk,
} from '../lib/validation';
import { CONTACT_EMAIL } from '../lib/site';
import { WHATSAPP_NUMBER, waLink } from '../lib/whatsapp';
import { submitLead } from '../services/leads';
import { FormField } from './ui/FormField';

const PAGE = '/teardown';

type Field = 'url' | 'name' | 'email' | 'phone';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'failed';

/** Trim, and add https:// when the visitor typed a bare domain ("example.com"). */
export function normaliseUrl(raw: string): string {
  const t = raw.trim();
  return t && !/^[a-z][a-z0-9+.-]*:/i.test(t) ? `https://${t}` : t;
}

export function validate(v: Values): Errors {
  const errors: Errors = {};
  const url = normaliseUrl(v.url);
  if (!url) errors.url = 'Add your site address.';
  else if (CONTROL_RE.test(url)) errors.url = `That address does not look right. ${HIDDEN_CHAR_HINT}`;
  else if (url.length > URL_MAX) errors.url = `Keep the address under ${URL_MAX} characters.`;
  else if (!URL_RE.test(url) || !url.slice(url.indexOf('//') + 2).includes('.'))
    errors.url = 'That does not look like a web address. Try https://yoursite.com.';
  const name = v.name.trim();
  if (CONTROL_RE.test(name)) errors.name = `That name does not look right. ${HIDDEN_CHAR_HINT}`;
  else if (name.length < NAME_MIN) errors.name = 'Add your name.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;
  const email = v.email.trim();
  if (!email) errors.email = 'Add your email.';
  else if (CONTROL_RE.test(email)) errors.email = `That email does not look right. ${HIDDEN_CHAR_HINT}`;
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.email = 'That email does not look right.';
  if (v.phone.trim() && !phoneOk(v.phone)) errors.phone = 'That number does not look right.';
  return errors;
}

/** The free-teardown request form. Goes through the Worker lead path as a `lead_magnet`. */
export function TeardownForm() {
  const uid = useId();
  const [values, setValues] = useState<Values>({ url: '', name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  // Guards a double submit that lands before the `sending` render commits.
  const inFlight = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'sent') statusRef.current?.focus();
  }, [status]);

  const set = (field: Field) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const found = validate(values);
    // Commit aria-invalid and the error text before focus moves, so the field is announced with its error.
    flushSync(() => setErrors(found));
    const first = (['url', 'name', 'email', 'phone'] as const).find((f) => found[f]);
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }

    inFlight.current = true;
    setStatus('sending');
    const url = normaliseUrl(values.url);
    let ok = false;
    try {
      ({ ok } = await submitLead({
        type: 'lead_magnet',
        name: values.name.trim(),
        email: values.email.trim(),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
        message: `Teardown request for ${url}`,
        page: PAGE,
        url,
      }));
      if (ok) track('lead_submit', { type: 'lead_magnet' });
    } catch {
      // submitLead resolves { ok: false } rather than throw; this only keeps the form from sticking on "Sending".
    } finally {
      inFlight.current = false;
      setStatus(ok ? 'sent' : 'failed');
    }
  }

  const sending = status === 'sending';
  const sent = status === 'sent';
  const fallbackMessage = `Hi Tech Pravaha, I'd like the free teardown for ${normaliseUrl(values.url)}`;

  const field = (
    name: Field,
    label: string,
    extra: { type?: string; autoComplete?: string; optional?: boolean; maxLength?: number; inputMode?: 'text' | 'tel' | 'email'; hint?: string },
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
            <p className="text-[19px] leading-relaxed text-ink">
              Thanks. Your teardown will reach you within two working days.
            </p>
          </>
        )}
      </div>
      {!sent && (
        <form noValidate onSubmit={onSubmit} aria-label="Free teardown request" className="grid gap-6">
          {field('url', 'Site URL', { type: 'url', inputMode: 'text', autoComplete: 'url', maxLength: URL_MAX })}
          <div className="grid gap-6 sm:grid-cols-2">
            {field('name', 'Name', { autoComplete: 'name', maxLength: NAME_MAX })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email', maxLength: EMAIL_MAX })}
          </div>
          {field('phone', 'WhatsApp number', { type: 'tel', autoComplete: 'tel', optional: true })}
          <p className="text-sm text-muted">
            We will email the teardown and may follow up once on WhatsApp if you give a number.
          </p>

          <div>
            <button type="submit" disabled={sending} className="btn btn-primary min-h-14 px-7 text-base disabled:opacity-60">
              {sending ? 'Sending…' : 'Get my teardown'}
            </button>
          </div>

          {status === 'failed' && (
            <div role="alert" className="card p-6">
              <p className="text-ink">Request didn't send.</p>
              <p className="mt-2 text-ink-2">
                {WHATSAPP_NUMBER ? (
                  <a
                    href={waLink(fallbackMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('whatsapp_click', { page: PAGE })}
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
