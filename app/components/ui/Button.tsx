import type { PointerEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { m, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  /** Internal route: renders a router <Link>. */
  to?: string;
  /** External URL: renders an <a> (http(s) opens in a new tab). */
  href?: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

const VARIANT: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn border-transparent bg-transparent px-3 text-ink-2 hover:bg-surface hover:text-ink',
};

const SIZE: Record<Size, string> = {
  md: '',
  lg: 'min-h-14 px-7 text-base',
};

const MAX_PULL = 4; // px
const SPRING = { stiffness: 260, damping: 18, mass: 0.4 };

/**
 * Magnetic hover: the button leans toward a mouse pointer by at most 4px.
 * Mouse only (never touch), and inert under reduced motion.
 */
function useMagnetic(enabled: boolean) {
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);

  if (!enabled) return { style: { x, y }, handlers: {} };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const clamp = (v: number) => Math.max(-1, Math.min(1, v)) * MAX_PULL;
    x.set(clamp(dx));
    y.set(clamp(dy));
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { style: { x, y }, handlers: { onPointerMove, onPointerLeave } };
}

// `m` components get their features from the <LazyMotion> provider in root.tsx.
const MotionLink = m.create(Link);

export function Button({
  to,
  href,
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  ariaLabel,
  className = '',
}: ButtonProps) {
  const reduce = useReducedMotion() === true;
  const magnetic = useMagnetic(!reduce && variant !== 'ghost');

  const motionProps = {
    className: `${VARIANT[variant]} ${SIZE[size]} ${className}`.trim(),
    // motion drives transform; keep the CSS transition to colours so the two never fight.
    style: { ...magnetic.style, transitionProperty: 'background-color, border-color, color' },
    // Always set (motion adds tabindex for tap gestures) so server and client markup match.
    whileTap: { scale: reduce ? 1 : 0.98 },
    'aria-label': ariaLabel,
    onClick,
    ...magnetic.handlers,
  };

  if (to !== undefined) {
    return (
      <MotionLink to={to} {...motionProps}>
        {children}
      </MotionLink>
    );
  }

  if (href !== undefined) {
    const newTab = /^https?:\/\//.test(href);
    return (
      <m.a
        href={href}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...motionProps}
      >
        {children}
        {newTab && <span className="sr-only"> (opens in a new tab)</span>}
      </m.a>
    );
  }

  return (
    <m.button type="button" {...motionProps}>
      {children}
    </m.button>
  );
}
