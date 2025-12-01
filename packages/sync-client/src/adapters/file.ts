import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import type { DurableChange, DurableStorageAdapter, SyncScope } from '../types';
import type { SyncStateRecord, SyncVectorClock } from '@sdl/sync-core';

interface FilePersistedState {
  vectorClocks: Record<string, {
    clock: SyncVectorClock;
    serverEpoch: number;
    updatedAt: string;
    state: SyncStateRecord;
  }>;
  queued: DurableChange[];
}

const defaultState: FilePersistedState = {
  vectorClocks: {},
  queued: [],
};

export interface FileDurableStorageOptions {
  filePath: string;
}

async function ensureDirectory(filePath: string) {
  const directory = dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

async function loadState(filePath: string): Promise<FilePersistedState> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as FilePersistedState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...defaultState };
    }
    throw error;
  }
}

async function persistState(filePath: string, state: FilePersistedState) {
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify(state), 'utf8');
}

function scopeKey(scope: SyncScope): string {
  return `${scope.scopeType}:${scope.scopeId}`;
}

export class FileDurableStorage implements DurableStorageAdapter {
  constructor(private readonly options: FileDurableStorageOptions) {}

  private async load(): Promise<FilePersistedState> {
    return loadState(this.options.filePath);
  }

  async getVectorClock(scope: SyncScope): Promise<SyncVectorClock | null> {
    const state = await this.load();
    return state.vectorClocks[scopeKey(scope)]?.clock ?? null;
  }

  async setVectorClock(scope: SyncScope, clock: SyncVectorClock, serverEpoch: number): Promise<void> {
    const state = await this.load();
    const key = scopeKey(scope);
    const updatedAt = new Date().toISOString();
    state.vectorClocks[key] = {
      clock,
      serverEpoch,
      updatedAt,
      state: {
        id: key,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        deviceId: 'local',
        vectorClock: clock,
        serverEpoch,
        updatedAt,
      },
    };
    await persistState(this.options.filePath, state);
  }

  async enqueue(change: DurableChange): Promise<void> {
    const state = await this.load();
    const existingIndex = state.queued.findIndex((entry) => entry.id === change.id);
    if (existingIndex >= 0) {
      state.queued[existingIndex] = change;
    } else {
      state.queued.push(change);
    }
    await persistState(this.options.filePath, state);
  }

  async listQueued(): Promise<DurableChange[]> {
    const state = await this.load();
    return state.queued.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  async removeQueued(ids: string[]): Promise<void> {
    const state = await this.load();
    state.queued = state.queued.filter((entry) => !ids.includes(entry.id));
    await persistState(this.options.filePath, state);
  }

  async getState(scope: SyncScope): Promise<SyncStateRecord | null> {
    const state = await this.load();
    return state.vectorClocks[scopeKey(scope)]?.state ?? null;
  }
}
