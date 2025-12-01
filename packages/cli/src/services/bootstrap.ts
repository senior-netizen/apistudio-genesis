import { Logger } from '../core/logger.js';
import { getConfigDir, loadConfig } from '../core/config.js';
import { ensureDir } from '../utils/fs.js';

export async function bootstrapState(logger: Logger): Promise<void> {
  logger.banner();
  await ensureDir(getConfigDir());
  await loadConfig(logger);
}
