export * from './components';
export * from './providers/theme-provider';
export * from './tailwind';
export {
  CommandPalette as LegacyCommandPalette,
  type Command as LegacyCommand,
  type CommandPaletteProps as LegacyCommandPaletteProps,
  useCommandPalette as useLegacyCommandPalette
} from '../command-palette';
