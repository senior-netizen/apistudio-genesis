import type { WorkspaceBundle, HistoryEntry, ApiProject, ApiEnvironment, MockRoute } from '../../types/api';
import type { CollaborationState } from '../../types/collaboration';
import { apiFetch } from './client';

interface WorkspaceResponse {
  projects?: ApiProject[];
  environments?: ApiEnvironment[];
  mocks?: MockRoute[];
  collaboration?: CollaborationState;
}

export async function fetchWorkspaceBundle(): Promise<WorkspaceBundle> {
  const response = await apiFetch('/workspace', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load workspace');
  }
  const payload: WorkspaceResponse = await response.json();
  return {
    version: 1,
    projects: payload.projects ?? [],
    environments: payload.environments ?? [],
    history: [],
    mocks: payload.mocks ?? [],
    collaboration: payload.collaboration,
  };
}

export async function createWorkspace(payload: Partial<WorkspaceResponse> = {}): Promise<WorkspaceBundle> {
  const response = await apiFetch('/workspace', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create workspace');
  }
  const created: WorkspaceResponse = await response.json();
  return {
    version: 1,
    projects: created.projects ?? [],
    environments: created.environments ?? [],
    history: [],
    mocks: created.mocks ?? [],
    collaboration: created.collaboration,
  };
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await apiFetch('/history', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load history');
  }
  const payload: HistoryEntry[] = await response.json();
  return payload ?? [];
}

export async function recordHistory(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> {
  const response = await apiFetch('/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error('Failed to persist history entry');
  }
  const saved: HistoryEntry = await response.json();
  return saved;
}
