import type { Config } from 'tailwindcss';
import { sdlTailwindPreset } from '@sdl/ui/tailwind';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  presets: [sdlTailwindPreset],
  theme: {
    extend: {
      borderRadius: {
        xs: 'var(--sdl-radius-xs)',
        sm: 'var(--sdl-radius-sm)',
        md: 'var(--sdl-radius-md)',
        lg: 'var(--sdl-radius-lg)'
      },
      boxShadow: {
        soft: 'var(--sdl-shadow-soft)',
        glass: 'var(--sdl-shadow-glass)'
      },
      colors: {
        background: 'rgb(var(--sdl-color-background) / <alpha-value>)',
        foreground: 'rgb(var(--sdl-color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--sdl-color-muted) / <alpha-value>)',
        border: 'rgb(var(--sdl-color-border) / <alpha-value>)',
        accent: 'rgb(var(--sdl-color-accent) / <alpha-value>)',
        success: 'rgb(var(--sdl-color-success) / <alpha-value>)',
        warning: 'rgb(var(--sdl-color-warning) / <alpha-value>)',
        destructive: 'rgb(var(--sdl-color-danger) / <alpha-value>)',
        ring: 'rgb(var(--sdl-color-ring) / <alpha-value>)'
      },
      fontFamily: {
        sans: ["'Inter Variable'", 'Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        13: '3.25rem'
      }
    }
  },
  plugins: []
};

export default config;
