import type { StateCreator } from '@/vendor/zustand';
import type { ApiCollection, ApiProject, ApiRequest, ApiExample } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';

export interface CollectionsSlice {
  activeWorkspaceId: string | null;
  projects: ApiProject[];
  activeProjectId: string | null;
  activeCollectionId: string | null;
  activeRequestId: string | null;
  setActiveWorkspace: (workspaceId: string) => void;
  setActiveProject: (projectId: string) => void;
  setActiveCollection: (collectionId: string) => void;
  setActiveRequest: (requestId: string) => void;
  createProject: (name: string) => ApiProject;
  createCollection: (projectId: string, name: string) => ApiCollection | undefined;
  createRequest: (collectionId: string, request: Partial<ApiRequest>) => ApiRequest | undefined;
  updateRequest: (requestId: string, updater: (request: ApiRequest) => ApiRequest) => void;
  duplicateRequest: (requestId: string) => ApiRequest | undefined;
  saveExample: (requestId: string, example: Omit<ApiExample, 'id' | 'createdAt'> & { responseBody?: string }) => ApiExample | undefined;
  reorderCollections: (projectId: string, orderedIds: string[]) => void;
  reorderRequests: (collectionId: string, orderedIds: string[]) => void;
}

function updateCollectionRequest(collection: ApiCollection, requestId: string, updater: (request: ApiRequest) => ApiRequest) {
  collection.requests = collection.requests.map((request) => (request.id === requestId ? updater(request) : request));
}

export const createCollectionsSlice: StateCreator<AppState, [], [], CollectionsSlice> = (set, get, _api) => ({
  activeWorkspaceId: null,
  projects: [],
  activeProjectId: null,
  activeCollectionId: null,
  activeRequestId: null,
  setActiveWorkspace(workspaceId) {
    set((state) => {
      state.activeWorkspaceId = workspaceId;
    });
  },
  setActiveProject(projectId) {
    set((state) => {
      state.activeProjectId = projectId;
      const project = state.projects.find((item) => item.id === projectId);
      state.activeCollectionId = project?.collections[0]?.id ?? null;
      state.activeRequestId = project?.collections[0]?.requests[0]?.id ?? null;
    });
    const project = get().projects.find((item) => item.id === projectId);
    const firstRequest = project?.collections[0]?.requests[0];
    get().loadRequest(firstRequest);
  },
  setActiveCollection(collectionId) {
    set((state) => {
      state.activeCollectionId = collectionId;
      const project = state.projects.find((item) => item.id === state.activeProjectId);
      const collection = project?.collections.find((item) => item.id === collectionId);
      state.activeRequestId = collection?.requests[0]?.id ?? null;
    });
    const project = get().projects.find((item) => item.id === get().activeProjectId);
    const collection = project?.collections.find((item) => item.id === collectionId);
    const firstRequest = collection?.requests[0];
    get().loadRequest(firstRequest);
  },
  setActiveRequest(requestId) {
    const request = get()
      .projects.flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests)
      .find((item) => item.id === requestId);
    set((state) => {
      state.activeRequestId = requestId;
    });
    get().loadRequest(request);
  },
  createProject(name) {
    const project: ApiProject = {
      id: createId(),
      name,
      collections: []
    };
    set((state) => {
      state.projects.push(project);
      state.activeProjectId = project.id;
      state.activeCollectionId = null;
      state.activeRequestId = null;
    });
    return project;
  },
  createCollection(projectId, name) {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return undefined;
    const collection: ApiCollection = {
      id: createId(),
      name,
      description: '',
      folders: [],
      requests: [],
      tags: []
    };
    set((state) => {
      const target = state.projects.find((item) => item.id === projectId);
      if (!target) return;
      target.collections.push(collection);
      state.activeCollectionId = collection.id;
    });
    return collection;
  },
  createRequest(collectionId, request) {
    const collection = get().projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
    if (!collection) return undefined;
    const requestRecord: ApiRequest = {
      id: createId(),
      name: request.name ?? 'New request',
      method: request.method ?? 'GET',
      url: request.url ?? '',
      description: request.description,
      body: request.body ?? { mode: 'none' },
      headers: request.headers ?? [],
      params: request.params ?? [],
      auth: request.auth ?? { type: 'none' },
      scripts: request.scripts ?? { preRequest: '', test: '' },
      tags: request.tags ?? [],
      examples: request.examples ?? []
    };
    set((state) => {
      const target = state.projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
      target?.requests.push(requestRecord);
      state.activeRequestId = requestRecord.id;
    });
    return requestRecord;
  },
  updateRequest(requestId, updater) {
    set((state) => {
      state.projects.forEach((project) => {
        project.collections.forEach((collection) => {
          updateCollectionRequest(collection, requestId, updater);
        });
      });
    });
  },
  duplicateRequest(requestId) {
    const collection = get()
      .projects.flatMap((project) => project.collections)
      .find((item) => item.requests.some((request) => request.id === requestId));
    if (!collection) return undefined;
    const original = collection.requests.find((request) => request.id === requestId);
    if (!original) return undefined;
    const clone: ApiRequest = {
      ...original,
      id: createId(),
      name: `${original.name} copy`,
      examples: original.examples.map((example) => ({ ...example, id: createId() }))
    };
    set((state) => {
      const target = state.projects
        .flatMap((project) => project.collections)
        .find((item) => item.id === collection.id);
      target?.requests.push(clone);
      state.activeRequestId = clone.id;
    });
    return clone;
  },
  saveExample(requestId, example) {
    const record: ApiExample = {
      id: createId(),
      createdAt: new Date().toISOString(),
      name: example.name,
      description: example.description,
      responseBody: example.responseBody,
      responseHeaders: example.responseHeaders,
      status: example.status
    };
    set((state) => {
      state.projects.forEach((project) => {
        project.collections.forEach((collection) => {
          updateCollectionRequest(collection, requestId, (request) => ({
            ...request,
            examples: [...request.examples, record]
          }));
        });
      });
    });
    return record;
  },
  reorderCollections(projectId, orderedIds) {
    set((state) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return;
      project.collections = orderedIds
        .map((id) => project.collections.find((collection) => collection.id === id))
        .filter((collection): collection is ApiCollection => Boolean(collection));
    });
  },
  reorderRequests(collectionId, orderedIds) {
    set((state) => {
      const collection = state.projects
        .flatMap((project) => project.collections)
        .find((item) => item.id === collectionId);
      if (!collection) return;
      collection.requests = orderedIds
        .map((id) => collection.requests.find((request) => request.id === id))
        .filter((request): request is ApiRequest => Boolean(request));
    });
  }
});
