import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../store';
import type { HistoryEntry } from '../types/api';

const recordHistoryMock = vi.fn(async (entry: Omit<HistoryEntry, 'id'>) => ({ ...entry, id: 'server-id' }));
vi.mock('../lib/api/workspace', () => ({
  recordHistory: (entry: Omit<HistoryEntry, 'id'>) => recordHistoryMock(entry),
}));

describe('history slice', () => {
  it('persists history via backend service', async () => {
    const entry: Omit<HistoryEntry, 'id'> = {
      requestId: 'r-1',
      method: 'GET',
      url: '/api/test',
      status: 200,
      duration: 120,
      timestamp: new Date().toISOString(),
    };

    await useAppStore.getState().addHistoryEntry(entry);
    expect(recordHistoryMock).toHaveBeenCalledWith(entry);
    const saved = useAppStore.getState().history[0];
    expect(saved?.id).toBe('server-id');
  });
});
