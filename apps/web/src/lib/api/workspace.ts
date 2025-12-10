import type { WorkspaceBundle, HistoryEntry, ApiProject, ApiEnvironment, MockRoute } from '../../types/api';
import type { CollaborationState } from '../../types/collaboration';
import { apiFetch } from './client';

interface WorkspaceResponse {
  projects?: ApiProject[];
  environments?: ApiEnvironment[];
  mocks?: MockRoute[];
  collaboration?: CollaborationState;
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  ownerId?: string;
  createdAt?: string;
}

export interface WorkspaceAuditLog {
  id: string;
  workspaceId: string;
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: string;
}

export async function fetchWorkspaceBundle(): Promise<WorkspaceBundle> {
  const response = await apiFetch('/v1/workspace', { method: 'GET' });
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

export async function exportWorkspace(workspaceId: string): Promise<WorkspaceBundle> {
  const response = await apiFetch(`/v1/workspace/${workspaceId}/export`, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to export workspace');
  }
  return response.json();
}

export async function importWorkspace(
  workspaceId: string,
  bundle: WorkspaceBundle,
  options: { dryRun?: boolean } = {},
) {
  const query = options.dryRun ? '?dryRun=true' : '';
  const response = await apiFetch(`/v1/workspace/${workspaceId}/import${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });
  if (!response.ok) {
    throw new Error('Failed to import workspace');
  }
  return response.json();
}

export async function fetchWorkspaceAuditLogs(
  workspaceId: string,
  options: { limit?: number; actions?: string[] } = {},
): Promise<WorkspaceAuditLog[]> {
  const params = new URLSearchParams();
  if (options.limit) {
    params.set('limit', String(options.limit));
  }
  if (options.actions?.length) {
    params.set('actions', options.actions.join(','));
  }
  const query = params.toString();
  const response = await apiFetch(
    `/v1/workspaces/${workspaceId}/audit-logs${query ? `?${query}` : ''}`,
    { method: 'GET' },
  );
  if (!response.ok) {
    throw new Error('Failed to load audit logs');
  }
  return response.json();
}

export async function listWorkspaces(): Promise<WorkspaceListItem[]> {
  const response = await apiFetch('/v1/workspaces', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load workspaces');
  }
  return response.json();
}

export async function createWorkspace(payload: Partial<WorkspaceResponse> = {}): Promise<WorkspaceBundle> {
  const response = await apiFetch('/v1/workspace', {
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
