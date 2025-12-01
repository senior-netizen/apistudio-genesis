import { RequestRunner, type RunnerHistoryEntry } from '@sdl/request-runner';

const STORAGE_KEY = 'sdl.request-runner.history';

function createStorage() {
  if (typeof window === 'undefined') return undefined;
  return {
    load: async () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [] as RunnerHistoryEntry[];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as RunnerHistoryEntry[];
        return parsed as RunnerHistoryEntry[];
      } catch (error) {
        console.warn('Failed to load request history', error);
        return [] as RunnerHistoryEntry[];
      }
    },
    save: async (history: RunnerHistoryEntry[]) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.warn('Failed to persist request history', error);
      }
    }
  };
}

export const requestRunner = new RequestRunner({
  platform: 'web',
  historyStorage: createStorage()
});
