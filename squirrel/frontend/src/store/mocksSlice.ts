import type { StateCreator } from '@/vendor/zustand';
import type { MockRoute, ResponseSnapshot } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';

export interface MocksSlice {
  mocks: MockRoute[];
  mockServerRunning: boolean;
  mockServerUrl: string;
  addMock: (route: Omit<MockRoute, 'id'>) => MockRoute;
  updateMock: (id: string, updater: (mock: MockRoute) => MockRoute) => void;
  removeMock: (id: string) => void;
  toggleMockServer: () => void;
  resolveMock: (method: string, url: string) => ResponseSnapshot | undefined;
}

export const createMocksSlice: StateCreator<AppState, [], [], MocksSlice> = (set, get, _api) => ({
  mocks: [],
  mockServerRunning: false,
  mockServerUrl: 'http://localhost:8787/mocks',
  addMock(route) {
    const record: MockRoute = { ...route, id: createId() };
    set((state) => {
      state.mocks.push(record);
    });
    return record;
  },
  updateMock(id, updater) {
    set((state) => {
      state.mocks = state.mocks.map((mock) => (mock.id === id ? updater(mock) : mock));
    });
  },
  removeMock(id) {
    set((state) => {
      state.mocks = state.mocks.filter((mock) => mock.id !== id);
    });
  },
  toggleMockServer() {
    set((state) => {
      state.mockServerRunning = !state.mockServerRunning;
    });
  },
  resolveMock(method, url) {
    if (!get().mockServerRunning) return undefined;
    const normalized = url.toLowerCase();
    const match = get().mocks.find(
      (mock) => mock.enabled && mock.method.toLowerCase() === method.toLowerCase() && normalized.includes(mock.url.toLowerCase())
    );
    if (!match) return undefined;
    return {
      id: createId(),
      status: match.responseStatus,
      statusText: 'MOCK',
      method,
      url,
      duration: 2,
      size: match.responseBody.length,
      headers: match.responseHeaders,
      body: match.responseBody,
      cookies: [],
      timeline: [
        { phase: 'dns', duration: 0 },
        { phase: 'tcp', duration: 0 },
        { phase: 'tls', duration: 0 },
        { phase: 'ttfb', duration: 1 },
        { phase: 'download', duration: 1 }
      ],
      completedAt: new Date().toISOString()
    };
  }
});
