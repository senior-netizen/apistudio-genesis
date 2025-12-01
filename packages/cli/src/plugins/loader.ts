import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { Logger } from '../core/logger.js';
import { getConfigDir } from '../core/config.js';

export async function loadPlugins(program: Command, logger: Logger): Promise<void> {
  try {
    const pluginsDir = path.join(getConfigDir(), 'plugins');
    if (!fs.existsSync(pluginsDir)) return;
    const files = await fs.promises.readdir(pluginsDir);
    await Promise.all(
      files
        .filter((file) => file.endsWith('.js'))
        .map(async (file) => {
          try {
            const pluginModule = await import(path.join(pluginsDir, file));
            if (typeof pluginModule.default === 'function') {
              pluginModule.default(program);
              logger.info(`Loaded plugin: ${file}`);
            }
          } catch (error) {
            logger.error(`Failed to load plugin ${file}`);
          }
        })
    );
  } catch (error) {
    logger.warn('Plugin loading skipped');
  }
}
