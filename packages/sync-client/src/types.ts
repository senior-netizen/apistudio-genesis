import type {
  ChangeEnvelope,
  ScopeType,
  SyncAck,
  SyncMetricsSample,
  SyncPresenceEvent,
  SyncPullResponse,
  SyncVectorClock,
  WorkspaceKind,
} from '@sdl/sync-core';
import type { SyncStateRecord } from '@sdl/sync-core';

export type SyncStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'error';

export interface SyncScope {
  scopeType: ScopeType;
  scopeId: string;
  vectorClock?: SyncVectorClock;
  sinceEpoch?: number;
}

export interface DurableChange {
  id: string;
  change: Omit<ChangeEnvelope, 'serverEpoch' | 'createdAt'>;
  enqueuedAt: number;
}

export interface DurableStorageAdapter {
  getVectorClock(scope: SyncScope): Promise<SyncVectorClock | null>;
  setVectorClock(scope: SyncScope, clock: SyncVectorClock, serverEpoch: number): Promise<void>;
  enqueue(change: DurableChange): Promise<void>;
  listQueued(): Promise<DurableChange[]>;
  removeQueued(ids: string[]): Promise<void>;
  getState(scope: SyncScope): Promise<SyncStateRecord | null>;
}

export interface SyncClientLogger {
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface SyncClientOptions {
  baseUrl: string;
  workspaceId: string;
  protocolVersion: string;
  appKind: WorkspaceKind;
  clientId: string;
  storage: DurableStorageAdapter;
  fetchImplementation?: typeof fetch;
  WebSocketImplementation?: typeof WebSocket;
  logger?: SyncClientLogger;
  pullIntervalMs?: number;
  pushDebounceMs?: number;
  presenceDebounceMs?: number;
}

export interface SyncConflictEvent {
  scopeType: ScopeType;
  scopeId: string;
  deviceId: string;
  divergence: number;
}

export type SyncConflictResolutionAction = 'accept' | 'decline' | 'rebase';

export type SyncClientEvents = {
  status: (status: SyncStatus) => void;
  error: (error: Error) => void;
  changes: (payload: { scope: SyncScope; changes: ChangeEnvelope[] }) => void;
  snapshot: (payload: { scope: SyncScope; response: SyncPullResponse }) => void;
  ack: (ack: SyncAck) => void;
  presence: (event: SyncPresenceEvent) => void;
  conflict: (event: SyncConflictEvent) => void;
  metrics: (sample: SyncMetricsSample) => void;
};
