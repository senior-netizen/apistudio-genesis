import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'sdl-theme-mode';

function applyTheme(mode: ThemeMode) {
  const root = window.document.documentElement;
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;

  root.dataset.theme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
}

export const SDLThemeProvider: React.FC<React.PropsWithChildren<{ defaultMode?: ThemeMode }>> = ({
  children,
  defaultMode = 'system'
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return defaultMode;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? defaultMode;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    applyTheme(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };

    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = reducedMotion ? 'reduce' : 'allow';
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ mode, setMode }), [mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useSDLTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useSDLTheme must be used within an SDLThemeProvider');
  }

  return ctx;
}
