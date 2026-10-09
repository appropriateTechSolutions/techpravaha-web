interface MarkProps {
  size?: number;
  className?: string;
}

/** Cornerstone mark: square with a quarter-circle corner and a sage dot. */
export function Mark({ size = 28, className = '' }: MarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d="M 18 18 H 50 A 32 32 0 0 1 82 50 V 82 H 18 Z" fill="currentColor" />
      <circle cx="34" cy="66" r="8" className="fill-accent" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-display font-semibold tracking-[-0.02em] text-[19px] leading-none text-ink">
      Tech Pravaha
    </span>
  );
}

/** Mark (28px) + wordmark, used in the header and footer. */
export function Lockup() {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <Mark size={28} />
      <Wordmark />
    </span>
  );
}
