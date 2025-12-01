import { createId } from '../../store/utils';
import type { ApiCollection, ApiEnvironment, ApiProject, ApiRequest, HistoryEntry, WorkspaceBundle } from '../../types/api';
import { fetchCollections, fetchEnvironments, fetchProjects, fetchRequests, fetchWorkspaces } from '../../services/data';
import { createInitialCollaborationState } from '../../store/collaborationSlice';
import { api } from '../../services/api';

function mapRequest(record: any): ApiRequest {
  const headersArray = Object.entries((record.headers as Record<string, string>) ?? {}).map(([key, value]) => ({
    id: createId(),
    key,
    value: String(value),
    enabled: true,
  }));
  const bodyContent = record.body ? JSON.stringify(record.body, null, 2) : undefined;
  return {
    id: record.id,
    name: record.name,
    method: record.method,
    url: record.url,
    description: record.description ?? '',
    body: bodyContent ? { mode: 'raw', raw: bodyContent } : { mode: 'none' },
    headers: headersArray,
    params: [],
    auth: { type: 'none' },
    scripts: { preRequest: '', test: '' },
    tags: [],
    examples: [],
  };
}

function mapEnvironment(record: any): ApiEnvironment {
  const variables = Object.entries((record.values ?? {}) as Record<string, string>).map(([key, value]) => ({
    id: createId(),
    key,
    value,
    scope: 'environment' as const,
    enabled: true,
  }));
  return {
    id: record.id,
    name: record.name,
    variables,
    isDefault: record.scope === 'WORKSPACE',
  };
}

export async function loadWorkspaceBundle(): Promise<WorkspaceBundle> {
  const workspaces = await fetchWorkspaces(1, 1);
  const workspace = workspaces.items?.[0];
  if (!workspace) {
    return {
      version: 1,
      projects: [],
      environments: [],
      history: [],
      mocks: [],
      collaboration: createInitialCollaborationState(),
      workspaceId: undefined,
    };
  }

  const projectsResponse = await fetchProjects(workspace.id, 1, 50);
  const projects: ApiProject[] = [];
  const environments: ApiEnvironment[] = [];

  for (const projectRecord of projectsResponse.items ?? []) {
    const [collectionsResponse, requestsResponse, envResponse] = await Promise.all([
      fetchCollections(projectRecord.id),
      fetchRequests(projectRecord.id, 1, 100),
      fetchEnvironments(projectRecord.id),
    ]);
    const collectionRecords: any[] = collectionsResponse ?? [];
    const requestRecords: any[] = requestsResponse.items ?? [];
    const envRecords: any[] = envResponse ?? [];

    const collectionMap = new Map<string, ApiCollection>();
    for (const collection of collectionRecords) {
      collectionMap.set(collection.id, {
        id: collection.id,
        name: collection.name,
        description: collection.description ?? '',
        folders: [],
        requests: [],
        tags: [],
      });
    }

    const uncategorized: ApiCollection = {
      id: createId(),
      name: 'Uncategorized',
      description: '',
      folders: [],
      requests: [],
      tags: [],
    };

    for (const request of requestRecords) {
      const mapped = mapRequest(request);
      if (request.collectionId && collectionMap.has(request.collectionId)) {
        collectionMap.get(request.collectionId)!.requests.push(mapped);
      } else {
        uncategorized.requests.push(mapped);
      }
    }

    const collections = Array.from(collectionMap.values());
    if (uncategorized.requests.length > 0) {
      collections.unshift(uncategorized);
    }

    projects.push({
      id: projectRecord.id,
      name: projectRecord.name,
      description: projectRecord.description ?? '',
      collections,
    });

    environments.push(...envRecords.map(mapEnvironment));
  }

  let history: HistoryEntry[] = [];
  try {
    const historyResponse = await api.get('/history');
    const records = Array.isArray(historyResponse.data) ? historyResponse.data : historyResponse.data?.items ?? [];
    history = records.map((record: any, index: number) => ({
      id: record.id ?? createId(),
      requestId: record.requestId ?? record.request_id ?? createId(),
      method: record.method ?? 'GET',
      url: record.url ?? '',
      status: record.status,
      duration: record.duration,
      body: record.body,
      timestamp: record.timestamp ?? record.createdAt ?? new Date().toISOString(),
      pinned: Boolean(record.pinned ?? false),
    }));
  } catch (error) {
    console.warn('[workspace] unable to fetch history from backend', error);
  }

  return {
    version: 1,
    projects,
    environments,
    history,
    mocks: [],
    collaboration: createInitialCollaborationState(),
    workspaceId: workspace.id,
  };
}
