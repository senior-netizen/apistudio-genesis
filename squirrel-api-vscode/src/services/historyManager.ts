/**
 * @squirrel/vscode - History manager centralizing logging, analytics, and import/export of requests.
 */

import { randomUUID } from "crypto";
import { ApiHistoryEntry, ApiRequestPayload, ApiResponsePayload, HistoryAnalyticsSnapshot } from "../types/api";
import {
  addHistoryEntry as storageAddHistory,
  clearHistory as storageClearHistory,
  getAnalyticsSnapshot,
  getHistory as storageGetHistory,
  saveAnalyticsSnapshot,
} from "../utils/storage";

const analyticsFallback: HistoryAnalyticsSnapshot = {
  total: 0,
  successes: 0,
  failures: 0,
  averageLatency: 0,
  favorites: 0,
};

export const getHistory = async (): Promise<ApiHistoryEntry[]> => storageGetHistory();

const computeAnalytics = (history: ApiHistoryEntry[]): HistoryAnalyticsSnapshot => {
  if (!history.length) {
    return { ...analyticsFallback };
  }
  let successes = 0;
  let failures = 0;
  let totalLatency = 0;
  let latencySamples = 0;
  let favorites = 0;
  for (const entry of history) {
    if (entry.favorite) {
      favorites += 1;
    }
    if (entry.response) {
      totalLatency += entry.response.duration;
      latencySamples += 1;
      if (entry.response.status >= 200 && entry.response.status < 400) {
        successes += 1;
      } else {
        failures += 1;
      }
    } else {
      failures += 1;
    }
  }
  return {
    total: history.length,
    successes,
    failures,
    favorites,
    averageLatency: latencySamples ? Math.round(totalLatency / latencySamples) : 0,
  };
};

const persistAnalytics = async (history: ApiHistoryEntry[]): Promise<HistoryAnalyticsSnapshot> => {
  const snapshot = computeAnalytics(history);
  await saveAnalyticsSnapshot(snapshot);
  return snapshot;
};

export const logRequest = async (
  request: ApiRequestPayload,
  response?: ApiResponsePayload,
  errorMessage?: string
): Promise<{ history: ApiHistoryEntry[]; analytics: HistoryAnalyticsSnapshot; entry: ApiHistoryEntry }> => {
  const entry: ApiHistoryEntry = {
    id: randomUUID(),
    timestamp: Date.now(),
    request,
    response,
    errorMessage,
    status: response?.status,
    latency: response?.duration,
  };
  await storageAddHistory(entry);
  const history = await getHistory();
  const analytics = await persistAnalytics(history);
  return { history, analytics, entry };
};

export const resetHistory = async (): Promise<{ history: ApiHistoryEntry[]; analytics: HistoryAnalyticsSnapshot }> => {
  await storageClearHistory();
  const history = await getHistory();
  const analytics = await persistAnalytics(history);
  return { history, analytics };
};

export const toggleFavorite = async (
  id: string,
  favorite: boolean
): Promise<{ history: ApiHistoryEntry[]; analytics: HistoryAnalyticsSnapshot }> => {
  const history = await getHistory();
  const updated = history.map((entry) => (entry.id === id ? { ...entry, favorite } : entry));
  const analytics = await persistAnalytics(updated);
  await resetHistoryInternal(updated);
  return { history: updated, analytics };
};

const resetHistoryInternal = async (entries: ApiHistoryEntry[]) => {
  // reuse storageAddHistory to ensure trimming to 50 entries
  await storageClearHistory();
  const ordered = [...entries].slice(0, 50).reverse();
  for (const entry of ordered) {
    await storageAddHistory(entry);
  }
};

export const importHistory = async (
  entries: ApiHistoryEntry[]
): Promise<{ history: ApiHistoryEntry[]; analytics: HistoryAnalyticsSnapshot }> => {
  const sanitized = entries
    .filter((entry) => entry && entry.request && entry.timestamp)
    .slice(0, 50)
    .map((entry) => ({
      ...entry,
      id: entry.id ?? randomUUID(),
      timestamp: entry.timestamp,
    }));
  await resetHistoryInternal(sanitized);
  const history = await getHistory();
  const analytics = await persistAnalytics(history);
  return { history, analytics };
};

export const getAnalytics = async (): Promise<HistoryAnalyticsSnapshot> => {
  const stored = await getAnalyticsSnapshot(analyticsFallback);
  if (stored.total === 0) {
    const history = await getHistory();
    return persistAnalytics(history);
  }
  return stored;
};

export const getHistoryExport = async (): Promise<ApiHistoryEntry[]> => {
  const history = await getHistory();
  return history.slice(0, 50);
};
