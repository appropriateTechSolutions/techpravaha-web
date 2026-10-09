import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';

/**
 * Theme state. Dark is the default (`:root`); light is `html.light`.
 * The inline THEME_INIT script in root.tsx sets the class before paint;
 * this hook reads it on mount and persists changes to localStorage('theme').
 */
export function useTheme(): { isLight: boolean; toggle(): void } {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('light');
    document.documentElement.classList.toggle('light', next);
    try {
      localStorage.setItem('theme', next ? 'light' : 'dark');
    } catch {
      // Storage blocked (private mode, quota): the theme still applies for this visit.
    }
    setIsLight(next);
  };

  return { isLight, toggle };
}

interface ThemeToggleProps {
  isLight: boolean;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ isLight, onToggle, className = '' }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className={`inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface hover:text-ink ${className}`}
    >
      {isLight ? <Moon size={18} weight="bold" aria-hidden /> : <Sun size={18} weight="bold" aria-hidden />}
    </button>
  );
}
