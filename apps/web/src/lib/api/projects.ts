import type { ApiProject } from '../../types/api';
import { apiFetch } from './client';

export async function createProject(name: string): Promise<ApiProject> {
    const response = await apiFetch('/workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        throw new Error('Failed to create project');
    }
    return response.json();
}

export async function updateProject(id: string, updates: Partial<ApiProject>): Promise<ApiProject> {
    const response = await apiFetch(`/workspace/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error('Failed to update project');
    }
    return response.json();
}

export async function deleteProject(id: string): Promise<void> {
    const response = await apiFetch(`/workspace/projects/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete project');
    }
}
