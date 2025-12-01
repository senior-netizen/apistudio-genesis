import type { StateCreator } from '@/vendor/zustand';
import type { HistoryEntry } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';
import { recordHistory } from '../lib/api/workspace';

export interface HistorySlice {
  history: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => Promise<void>;
  togglePinned: (id: string) => void;
  clearHistory: () => void;
}

export const createHistorySlice: StateCreator<AppState, [], [], HistorySlice> = (set) => ({
  history: [],
  async addHistoryEntry(entry) {
    const optimistic: HistoryEntry = { ...entry, id: createId() };
    set((state) => {
      state.history.unshift(optimistic);
      state.history = state.history.slice(0, 200);
    });
    try {
      const saved = await recordHistory(entry);
      set((state) => {
        const idx = state.history.findIndex((item) => item.id === optimistic.id);
        if (idx !== -1) {
          state.history[idx] = saved;
        }
      });
    } catch (error) {
      console.warn('[history] failed to persist entry', error);
    }
  },
  togglePinned(id) {
    set((state) => {
      state.history = state.history.map((item) =>
        item.id === id
          ? {
              ...item,
              pinned: !item.pinned
            }
          : item
      );
    });
  },
  clearHistory() {
    set((state) => {
      state.history = [];
    });
  }
});
