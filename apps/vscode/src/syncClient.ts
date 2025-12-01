import { ExtensionContext, window } from 'vscode';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { SyncClient } from '@sdl/sync-client';
import { FileDurableStorage } from '@sdl/sync-client/adapters/file';
import type { SyncClientOptions, SyncStatus } from '@sdl/sync-client';

export type ExtensionSyncOptions = Omit<SyncClientOptions, 'storage'>;

export function createExtensionSyncClient(context: ExtensionContext, options: ExtensionSyncOptions) {
  const baseDir = join(context.globalStorageUri.fsPath, 'sync');
  mkdirSync(baseDir, { recursive: true });
  const storage = new FileDurableStorage({ filePath: join(baseDir, `${options.workspaceId}.json`) });
  const client = new SyncClient({ ...options, storage });
  const handler = (status: SyncStatus) => {
    window.setStatusBarMessage(`Squirrel Sync: ${status}`, 2000);
  };
  client.on('status', handler);
  context.subscriptions.push({ dispose: () => client.off('status', handler) });
  return client;
}
