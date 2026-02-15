import type { SyncConflictResolutionAction } from '@sdl/sync-client';

export const CONFLICT_RESOLUTION_STORAGE_KEY = 'squirrel.sync.conflict.resolutions';
export const RESOLUTION_TTL_MS = 1000 * 60 * 60;

export type StoredConflictResolution = {
  key: string;
  action: SyncConflictResolutionAction;
  at: number;
};

export const pruneResolutions = (
  entries: Record<string, StoredConflictResolution>,
  now = Date.now(),
): Record<string, StoredConflictResolution> => {
  return Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => now - entry.at < RESOLUTION_TTL_MS),
  );
};

export const loadStoredResolutions = (): Record<string, StoredConflictResolution> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(CONFLICT_RESOLUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredConflictResolution>;
    const filtered = pruneResolutions(parsed);
    if (Object.keys(filtered).length !== Object.keys(parsed).length) {
      window.localStorage.setItem(CONFLICT_RESOLUTION_STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return {};
  }
};

export const persistStoredResolution = (key: string, action: SyncConflictResolutionAction) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const current = loadStoredResolutions();
  current[key] = { key, action, at: Date.now() };
  window.localStorage.setItem(CONFLICT_RESOLUTION_STORAGE_KEY, JSON.stringify(current));
};
