import type { ApiEnvironment } from '../../types/api';
import { apiFetch } from './client';

export async function createEnvironment(data: Omit<ApiEnvironment, 'id'>): Promise<ApiEnvironment> {
    const response = await apiFetch('/workspace/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create environment');
    }
    return response.json();
}

export async function updateEnvironment(id: string, updates: Partial<ApiEnvironment>): Promise<ApiEnvironment> {
    const response = await apiFetch(`/workspace/environments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error('Failed to update environment');
    }
    return response.json();
}

export async function deleteEnvironment(id: string): Promise<void> {
    const response = await apiFetch(`/workspace/environments/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete environment');
    }
}
