import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { SDLThemeProvider, useSDLTheme, type ThemeMode } from '@sdl/ui';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark' | 'system';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeBridge({ children }: { children: ReactNode }) {
  const { mode, setMode } = useSDLTheme();
  const resolvedMode: ThemeContextValue['resolvedMode'] = useMemo(() => {
    if (mode !== 'system') return mode;
    if (typeof window === 'undefined') return 'system';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <SDLThemeProvider>
      <ThemeBridge>{children}</ThemeBridge>
    </SDLThemeProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
