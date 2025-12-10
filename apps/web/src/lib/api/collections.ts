import type { ApiCollection } from '../../types/api';
import { apiFetch } from './client';

export async function createCollection(
    projectId: string,
    data: { name: string; description?: string }
): Promise<ApiCollection> {
    const response = await apiFetch(`/v1/workspace/projects/${projectId}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create collection');
    }
    return response.json();
}

export async function updateCollection(id: string, updates: Partial<ApiCollection>): Promise<ApiCollection> {
    const response = await apiFetch(`/v1/workspace/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error('Failed to update collection');
    }
    return response.json();
}

export async function deleteCollection(id: string): Promise<void> {
    const response = await apiFetch(`/v1/workspace/collections/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete collection');
    }
}

export async function reorderCollections(projectId: string, orderedIds: string[]): Promise<void> {
    const response = await apiFetch(`/v1/workspace/projects/${projectId}/collections/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
        throw new Error('Failed to reorder collections');
    }
}
