import type { ChangeEnvelope, SnapshotEnvelope, SyncVectorClock } from './types';

export interface SyncStateRecord {
  id: string;
  scopeType: string;
  scopeId: string;
  deviceId: string;
  vectorClock: SyncVectorClock;
  serverEpoch: number;
  updatedAt: string;
}

export interface SyncStorageAdapter {
  loadVectorClock(scopeType: string, scopeId: string, deviceId: string): Promise<SyncStateRecord | null>;
  persistVectorClock(state: SyncStateRecord): Promise<void>;
  appendChanges(changes: ChangeEnvelope[]): Promise<void>;
  loadChanges(scopeType: string, scopeId: string, sinceEpoch?: number): Promise<ChangeEnvelope[]>;
  loadLatestSnapshot(scopeType: string, scopeId: string): Promise<SnapshotEnvelope | null>;
  saveSnapshot(snapshot: SnapshotEnvelope): Promise<void>;
}

export class InMemorySyncStorage implements SyncStorageAdapter {
  private readonly vectorClocks = new Map<string, SyncStateRecord>();
  private readonly changes = new Map<string, ChangeEnvelope[]>();
  private readonly snapshots = new Map<string, SnapshotEnvelope>();

  private static key(scopeType: string, scopeId: string, deviceId?: string) {
    return deviceId ? `${scopeType}:${scopeId}:${deviceId}` : `${scopeType}:${scopeId}`;
  }

  async loadVectorClock(scopeType: string, scopeId: string, deviceId: string): Promise<SyncStateRecord | null> {
    return this.vectorClocks.get(InMemorySyncStorage.key(scopeType, scopeId, deviceId)) ?? null;
  }

  async persistVectorClock(state: SyncStateRecord): Promise<void> {
    this.vectorClocks.set(InMemorySyncStorage.key(state.scopeType, state.scopeId, state.deviceId), state);
  }

  async appendChanges(changes: ChangeEnvelope[]): Promise<void> {
    for (const change of changes) {
      const key = InMemorySyncStorage.key(change.scopeType, change.scopeId);
      const bucket = this.changes.get(key) ?? [];
      bucket.push(change);
      this.changes.set(key, bucket);
    }
  }

  async loadChanges(scopeType: string, scopeId: string, sinceEpoch?: number): Promise<ChangeEnvelope[]> {
    const key = InMemorySyncStorage.key(scopeType, scopeId);
    const bucket = this.changes.get(key) ?? [];
    if (sinceEpoch == null) {
      return [...bucket];
    }
    return bucket.filter((change) => change.serverEpoch > sinceEpoch);
  }

  async loadLatestSnapshot(scopeType: string, scopeId: string): Promise<SnapshotEnvelope | null> {
    return this.snapshots.get(InMemorySyncStorage.key(scopeType, scopeId)) ?? null;
  }

  async saveSnapshot(snapshot: SnapshotEnvelope): Promise<void> {
    this.snapshots.set(InMemorySyncStorage.key(snapshot.scopeType, snapshot.scopeId), snapshot);
  }
}
