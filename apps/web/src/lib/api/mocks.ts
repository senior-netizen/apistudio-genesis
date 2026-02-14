import type { MockRoute } from '../../types/api';
import { apiFetch } from './client';

export async function createMock(data: Omit<MockRoute, 'id'>): Promise<MockRoute> {
    const response = await apiFetch('/v1/workspace/mocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create mock');
    }
    return response.json();
}

export async function updateMock(id: string, updates: Partial<MockRoute>): Promise<MockRoute> {
    const response = await apiFetch(`/v1/workspace/mocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error('Failed to update mock');
    }
    return response.json();
}

export async function deleteMock(id: string): Promise<void> {
    const response = await apiFetch(`/v1/workspace/mocks/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete mock');
    }
}

export async function toggleMockServer(): Promise<{ running: boolean }> {
    const response = await apiFetch('/v1/workspace/mocks/toggle', {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to toggle mock server');
    }
    return response.json();
}


export const mocksApi = {
  listMockServers: async (_workspaceId: string) => [] as any[],
  createMockServer: async (_workspaceId: string, _payload: { name: string }) => ({ id: '', routes: [] } as any),
  updateMockServer: async (_id: string, _payload: Record<string, unknown>) => undefined,
  deleteMockServer: async (_id: string) => undefined,
  addRoute: async (_mockServerId: string, data: { method: string; path: string; statusCode: number; responseBody: unknown }) =>
    createMock({
      requestId: `mock-${Date.now()}` as unknown as MockRoute['requestId'],
      url: data.path,
      method: data.method,
      responseStatus: data.statusCode,
      responseHeaders: {},
      responseBody: typeof data.responseBody === "string" ? data.responseBody : JSON.stringify(data.responseBody ?? {}),
      enabled: true,
    }),
  getMockServer: async (_id: string) => ({ id: _id, routes: [] } as any),
  deleteRoute: async (routeId: string) => deleteMock(routeId),
};
