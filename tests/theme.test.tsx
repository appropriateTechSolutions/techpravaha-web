import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Mark } from '../app/components/Logo';
import { SiteHeader } from '../app/components/SiteHeader';
import { useTheme } from '../app/components/ThemeToggle';

const MARK_PATH = 'M 18 18 H 50 A 32 32 0 0 1 82 50 V 82 H 18 Z';

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('light');
  try {
    localStorage.clear();
  } catch {
    // storage unavailable in this environment; nothing to clean
  }
});

describe('Mark', () => {
  it('renders an svg with the exact Cornerstone path', () => {
    const { container } = render(<Mark />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    const path = svg!.querySelector('path');
    expect(path).toHaveAttribute('d', MARK_PATH);
    expect(path).toHaveAttribute('fill', 'currentColor');
    const dot = svg!.querySelector('circle');
    expect(dot).toHaveAttribute('cx', '34');
    expect(dot).toHaveAttribute('cy', '66');
    expect(dot).toHaveAttribute('r', '8');
    expect(dot).toHaveClass('fill-accent');
  });
});

describe('useTheme', () => {
  it('toggle() adds and removes the light class on <html>', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isLight).toBe(false);

    act(() => result.current.toggle());
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(result.current.isLight).toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');

    act(() => result.current.toggle());
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(result.current.isLight).toBe(false);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('reads the class set by the inline script on mount', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.isLight).toBe(true);
  });

  it('still flips the class when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useTheme());

    expect(() => act(() => result.current.toggle())).not.toThrow();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(result.current.isLight).toBe(true);
  });
});

describe('SiteHeader mobile menu', () => {
  it('keeps foreign body overflow and closes when the viewport reaches lg', () => {
    let onChange: (e: { matches: boolean }) => void = () => {};
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: (_: string, cb: typeof onChange) => (onChange = cb), removeEventListener: () => {} }));
    document.body.style.overflow = 'clip';
    render(<MemoryRouter><SiteHeader isLight={false} onToggleTheme={() => {}} /></MemoryRouter>);
    expect(document.body.style.overflow).toBe('clip');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    act(() => onChange({ matches: true }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).toBe('clip');
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });
});
