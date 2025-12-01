import type { StateCreator } from '@/vendor/zustand';
import type { MockRoute, ResponseSnapshot } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';
import * as mocksApi from '../lib/api/mocks';

export interface MocksSlice {
  mocks: MockRoute[];
  mockServerRunning: boolean;
  mockServerUrl: string;
  addMock: (route: Omit<MockRoute, 'id'>) => Promise<MockRoute>;
  updateMock: (id: string, updater: (mock: MockRoute) => MockRoute) => Promise<void>;
  removeMock: (id: string) => Promise<void>;
  toggleMockServer: () => Promise<void>;
  resolveMock: (method: string, url: string) => ResponseSnapshot | undefined;
}

export const createMocksSlice: StateCreator<AppState, [], [], MocksSlice> = (set, get) => ({
  mocks: [],
  mockServerRunning: false,
  mockServerUrl: 'http://localhost:8787/mocks',
  async addMock(route) {
    const tempId = createId();
    const record: MockRoute = { ...route, id: tempId };
    // Optimistic update
    set((state) => {
      state.mocks.push(record);
    });
    try {
      const saved = await mocksApi.createMock(route);
      set((state) => {
        const index = state.mocks.findIndex((m) => m.id === tempId);
        if (index !== -1) {
          state.mocks[index] = saved;
        }
      });
      return saved;
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.mocks = state.mocks.filter((m) => m.id !== tempId);
      });
      throw error;
    }
  },
  async updateMock(id, updater) {
    const current = get().mocks.find((m) => m.id === id);
    if (!current) return;
    const updated = updater(current);
    // Optimistic update
    set((state) => {
      state.mocks = state.mocks.map((mock) => (mock.id === id ? updated : mock));
    });
    try {
      await mocksApi.updateMock(id, updated);
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.mocks = state.mocks.map((mock) => (mock.id === id ? current : mock));
      });
      throw error;
    }
  },
  async removeMock(id) {
    const removed = get().mocks.find((m) => m.id === id);
    if (!removed) return;
    // Optimistic update
    set((state) => {
      state.mocks = state.mocks.filter((mock) => mock.id !== id);
    });
    try {
      await mocksApi.deleteMock(id);
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.mocks.push(removed);
      });
      throw error;
    }
  },
  async toggleMockServer() {
    const currentState = get().mockServerRunning;
    // Optimistic update
    set((state) => {
      state.mockServerRunning = !state.mockServerRunning;
    });
    try {
      const result = await mocksApi.toggleMockServer();
      set((state) => {
        state.mockServerRunning = result.running;
      });
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.mockServerRunning = currentState;
      });
      throw error;
    }
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
