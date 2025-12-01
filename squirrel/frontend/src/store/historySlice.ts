import type { StateCreator } from '@/vendor/zustand';
import type { HistoryEntry } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';

export interface HistorySlice {
  history: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  togglePinned: (id: string) => void;
  clearHistory: () => void;
}

export const createHistorySlice: StateCreator<AppState, [], [], HistorySlice> = (set, _get, _api) => ({
  history: [],
  addHistoryEntry(entry) {
    set((state) => {
      const record: HistoryEntry = { ...entry, id: createId() };
      state.history.unshift(record);
      state.history = state.history.slice(0, 200);
    });
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
