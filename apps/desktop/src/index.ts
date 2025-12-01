import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { SyncClient } from '@sdl/sync-client';
import { FileDurableStorage } from '@sdl/sync-client/adapters/file';
import type { SyncClientOptions } from '@sdl/sync-client';

export interface DesktopSyncOptions extends Omit<SyncClientOptions, 'storage'> {
  storagePath?: string;
}

export function createDesktopSyncClient(options: DesktopSyncOptions) {
  const storagePath = options.storagePath ?? join(homedir(), '.sdl', 'sync', `${options.workspaceId}.json`);
  mkdirSync(dirname(storagePath), { recursive: true });
  const storage = new FileDurableStorage({ filePath: storagePath });
  return new SyncClient({ ...options, storage });
}
