import type { MockRoute } from '../../types/api';
import { apiFetch } from './client';

export async function createMock(data: Omit<MockRoute, 'id'>): Promise<MockRoute> {
    const response = await apiFetch('/workspace/mocks', {
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
    const response = await apiFetch(`/workspace/mocks/${id}`, {
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
    const response = await apiFetch(`/workspace/mocks/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete mock');
    }
}

export async function toggleMockServer(): Promise<{ running: boolean }> {
    const response = await apiFetch('/workspace/mocks/toggle', {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to toggle mock server');
    }
    return response.json();
}
