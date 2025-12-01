import type { ApiRequest, ApiExample } from '../../types/api';
import { apiFetch } from './client';

export async function createRequest(
    collectionId: string,
    data: Partial<ApiRequest>
): Promise<ApiRequest> {
    const response = await apiFetch(`/workspace/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create request');
    }
    return response.json();
}

export async function updateRequest(id: string, updates: Partial<ApiRequest>): Promise<ApiRequest> {
    const response = await apiFetch(`/workspace/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error('Failed to update request');
    }
    return response.json();
}

export async function deleteRequest(id: string): Promise<void> {
    const response = await apiFetch(`/workspace/requests/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete request');
    }
}

export async function duplicateRequest(id: string): Promise<ApiRequest> {
    const response = await apiFetch(`/workspace/requests/${id}/duplicate`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to duplicate request');
    }
    return response.json();
}

export async function saveExample(
    requestId: string,
    example: Omit<ApiExample, 'id' | 'createdAt'> & { responseBody?: string }
): Promise<ApiExample> {
    const response = await apiFetch(`/workspace/requests/${requestId}/examples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(example),
    });
    if (!response.ok) {
        throw new Error('Failed to save example');
    }
    return response.json();
}

export async function reorderRequests(collectionId: string, orderedIds: string[]): Promise<void> {
    const response = await apiFetch(`/workspace/collections/${collectionId}/requests/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
        throw new Error('Failed to reorder requests');
    }
}
