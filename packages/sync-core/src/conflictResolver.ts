import type { SyncVectorClock } from './types';

export interface VersionedRow {
  id: string;
  serverEpoch: number;
  lamportClock: number;
  updatedAt: string;
  deviceId: string;
  vectorClock?: SyncVectorClock;
}

export interface ConflictResolutionResult<T extends VersionedRow> {
  winner: T;
  loser?: T;
  reason: 'serverEpoch' | 'lamportClock' | 'updatedAt' | 'deviceId';
}

export function resolveRowConflict<T extends VersionedRow>(current: T, incoming: T): ConflictResolutionResult<T> {
  if (incoming.serverEpoch > current.serverEpoch) {
    return { winner: incoming, loser: current, reason: 'serverEpoch' };
  }
  if (incoming.serverEpoch < current.serverEpoch) {
    return { winner: current, loser: incoming, reason: 'serverEpoch' };
  }

  if (incoming.lamportClock > current.lamportClock) {
    return { winner: incoming, loser: current, reason: 'lamportClock' };
  }
  if (incoming.lamportClock < current.lamportClock) {
    return { winner: current, loser: incoming, reason: 'lamportClock' };
  }

  if (incoming.updatedAt > current.updatedAt) {
    return { winner: incoming, loser: current, reason: 'updatedAt' };
  }
  if (incoming.updatedAt < current.updatedAt) {
    return { winner: current, loser: incoming, reason: 'updatedAt' };
  }

  return incoming.deviceId.localeCompare(current.deviceId) >= 0
    ? { winner: incoming, loser: current, reason: 'deviceId' }
    : { winner: current, loser: incoming, reason: 'deviceId' };
}
