import type { Config } from 'tailwindcss';

export const sdlTailwindPreset: Config = {
  content: [],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        xl: '2rem'
      },
      screens: {
        '2xl': '1440px'
      }
    },
    extend: {
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter var"',
          'system-ui',
          '"Segoe UI"',
          'sans-serif'
        ]
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2' }],
        sm: ['0.875rem', { lineHeight: '1.35' }],
        base: ['1rem', { lineHeight: '1.5' }],
        lg: ['1.125rem', { lineHeight: '1.45' }],
        xl: ['1.5rem', { lineHeight: '1.45' }],
        '2xl': ['2rem', { lineHeight: '1.35' }],
        '3xl': ['2.75rem', { lineHeight: '1.3' }],
        '4xl': ['3.5rem', { lineHeight: '1.2' }]
      },
      colors: {
        background: 'rgb(var(--sdl-color-background) / <alpha-value>)',
        foreground: 'rgb(var(--sdl-color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--sdl-color-muted) / <alpha-value>)',
        border: 'rgb(var(--sdl-color-border) / <alpha-value>)',
        accent: 'rgb(var(--sdl-color-accent) / <alpha-value>)',
        success: 'rgb(var(--sdl-color-success) / <alpha-value>)',
        warning: 'rgb(var(--sdl-color-warning) / <alpha-value>)',
        danger: 'rgb(var(--sdl-color-danger) / <alpha-value>)',
        ring: 'rgb(var(--sdl-color-ring) / <alpha-value>)'
      },
      borderRadius: {
        xl: '1rem',
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem'
      },
      spacing: {
        0: '0px',
        1: '0.25rem',
        1.5: '0.375rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem'
      },
      boxShadow: {
        soft: '0 20px 40px -20px rgb(15 23 42 / 0.25)',
        focus: '0 0 0 2px rgb(var(--sdl-color-ring) / 0.3)',
        glass: '0 16px 40px -24px rgb(15 23 42 / 0.35)'
      },
      backgroundImage: {
        'soft-gradient':
          'linear-gradient(140deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.35))',
        'soft-glow': 'radial-gradient(circle at top, rgba(99, 102, 241, 0.22), transparent 55%)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'fade-up': 'fade-up 200ms cubic-bezier(0.22, 1, 0.36, 1) both'
      }
    }
  }
};

export default sdlTailwindPreset;
