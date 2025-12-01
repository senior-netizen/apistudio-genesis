import type { SyncVectorClock } from './types';

export type VectorClockComparison = 'ahead' | 'behind' | 'equal' | 'concurrent';

export function createVectorClock(initial: SyncVectorClock = {}): SyncVectorClock {
  return { ...initial };
}

export function incrementVector(clock: SyncVectorClock, deviceId: string): SyncVectorClock {
  const next = { ...clock };
  next[deviceId] = (next[deviceId] ?? 0) + 1;
  return next;
}

export function mergeVectorClocks(a: SyncVectorClock, b: SyncVectorClock): SyncVectorClock {
  const merged: SyncVectorClock = { ...a };
  for (const [deviceId, value] of Object.entries(b)) {
    merged[deviceId] = Math.max(value, merged[deviceId] ?? 0);
  }
  return merged;
}

export function compareVectorClocks(a: SyncVectorClock, b: SyncVectorClock): VectorClockComparison {
  let aIsAhead = false;
  let bIsAhead = false;

  const deviceIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const deviceId of deviceIds) {
    const aValue = a[deviceId] ?? 0;
    const bValue = b[deviceId] ?? 0;
    if (aValue > bValue) {
      aIsAhead = true;
    } else if (bValue > aValue) {
      bIsAhead = true;
    }
    if (aIsAhead && bIsAhead) {
      return 'concurrent';
    }
  }

  if (aIsAhead && !bIsAhead) {
    return 'ahead';
  }
  if (bIsAhead && !aIsAhead) {
    return 'behind';
  }
  return 'equal';
}

export function vectorClockToString(clock: SyncVectorClock): string {
  return Object.entries(clock)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([deviceId, value]) => `${deviceId}:${value}`)
    .join('|');
}
