import type { ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

/** Text input and textarea style shared by every form on the site. */
export const INPUT_CLASS =
  'w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-ink placeholder:text-muted-2 transition-colors focus:border-ink aria-[invalid=true]:border-ink disabled:opacity-60';

/** Inline error under a field; its id goes in the field's aria-describedby. */
export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-sm text-ink">
      <WarningCircle size={16} weight="bold" aria-hidden="true" className="shrink-0" />
      {children}
    </p>
  );
}

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email';
  optional?: boolean;
  /** Help text under the field, read after the error. */
  hint?: ReactNode;
}

/**
 * Label, input, inline error and optional hint. The error and hint are linked through
 * aria-describedby, so a screen reader announces both when the field takes focus.
 */
export function FormField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  inputMode,
  optional = false,
  hint,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={INPUT_CLASS}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
