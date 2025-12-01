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
    extend: {}
  },
  plugins: []
};

export default config;
