import type { Command } from 'commander';

export interface SquirrelPlugin {
  (program: Command): void | Promise<void>;
}
