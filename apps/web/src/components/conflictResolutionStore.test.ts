import { describe, expect, it, vi } from 'vitest';
import {
  CONFLICT_RESOLUTION_STORAGE_KEY,
  persistStoredResolution,
  pruneResolutions,
  RESOLUTION_TTL_MS,
} from './conflictResolutionStore';

describe('conflictResolutionStore', () => {
  it('prunes expired entries by TTL', () => {
    const now = 1_000_000;
    const result = pruneResolutions(
      {
        fresh: { key: 'fresh', action: 'accept', at: now - 1_000 },
        stale: { key: 'stale', action: 'decline', at: now - RESOLUTION_TTL_MS - 1 },
      },
      now,
    );

    expect(Object.keys(result)).toEqual(['fresh']);
  });

  it('persists conflict action into localStorage when available', () => {
    const store = new Map<string, string>();
    const windowMock = {
      localStorage: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value);
        }),
      },
    };

    vi.stubGlobal('window', windowMock as unknown as Window & typeof globalThis);

    persistStoredResolution('request:req-1:device-1', 'rebase');

    const saved = store.get(CONFLICT_RESOLUTION_STORAGE_KEY) ?? '';
    expect(saved).toContain('request:req-1:device-1');
    expect(saved).toContain('rebase');

    vi.unstubAllGlobals();
  });
});
