import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DurableChange, DurableStorageAdapter, SyncScope } from '../types';
import type { SyncStateRecord, SyncVectorClock } from '@sdl/sync-core';

interface SyncClientDb extends DBSchema {
  vector_clocks: {
    key: string;
    value: {
      key: string;
      clock: SyncVectorClock;
      serverEpoch: number;
      updatedAt: string;
      state: SyncStateRecord;
    };
    indexes: {
      updatedAt: string;
    };
  };
  queued_changes: {
    key: string;
    value: DurableChange & { scopeKey: string };
    indexes: {
      enqueuedAt: string;
    };
  };
}

const DEFAULT_DB_NAME = 'sdl-sync';
const DEFAULT_DB_VERSION = 1;

function buildScopeKey(scope: SyncScope): string {
  return `${scope.scopeType}:${scope.scopeId}`;
}

export interface IndexedDbDurableStorageOptions {
  name?: string;
  version?: number;
}

export class IndexedDbDurableStorage implements DurableStorageAdapter {
  private readonly dbPromise: Promise<IDBPDatabase<SyncClientDb>>;

  constructor(options: IndexedDbDurableStorageOptions = {}) {
    this.dbPromise = openDB<SyncClientDb>(options.name ?? DEFAULT_DB_NAME, options.version ?? DEFAULT_DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains('vector_clocks')) {
          const store = db.createObjectStore('vector_clocks', { keyPath: 'key' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('queued_changes')) {
          const store = db.createObjectStore('queued_changes', { keyPath: 'id' });
          store.createIndex('enqueuedAt', 'enqueuedAt');
        }
      },
    });
  }

  private async db() {
    return this.dbPromise;
  }

  async getVectorClock(scope: SyncScope): Promise<SyncVectorClock | null> {
    const record = await (await this.db()).get('vector_clocks', buildScopeKey(scope));
    return record?.clock ?? null;
  }

  async setVectorClock(scope: SyncScope, clock: SyncVectorClock, serverEpoch: number): Promise<void> {
    const key = buildScopeKey(scope);
    const updatedAt = new Date().toISOString();
    const state: SyncStateRecord = {
      id: key,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      deviceId: 'local',
      vectorClock: clock,
      serverEpoch,
      updatedAt,
    };
    await (await this.db()).put('vector_clocks', { key, clock, serverEpoch, updatedAt, state });
  }

  async enqueue(change: DurableChange): Promise<void> {
    const scopeKey = buildScopeKey({ scopeType: change.change.scopeType, scopeId: change.change.scopeId });
    await (await this.db()).put('queued_changes', { ...change, scopeKey });
  }

  async listQueued(): Promise<DurableChange[]> {
    const db = await this.db();
    const rows = await db.getAllFromIndex('queued_changes', 'enqueuedAt');
    return rows
      .sort((a, b) => a.enqueuedAt - b.enqueuedAt)
      .map(({ id, change, enqueuedAt }) => ({ id, change, enqueuedAt }));
  }

  async removeQueued(ids: string[]): Promise<void> {
    const db = await this.db();
    await Promise.all(ids.map((id) => db.delete('queued_changes', id)));
  }

  async getState(scope: SyncScope): Promise<SyncStateRecord | null> {
    const record = await (await this.db()).get('vector_clocks', buildScopeKey(scope));
    return record?.state ?? null;
  }
}
