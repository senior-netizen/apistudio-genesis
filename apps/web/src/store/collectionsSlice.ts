import type { StateCreator } from '@/vendor/zustand';
import type { ApiCollection, ApiProject, ApiRequest, ApiExample } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';
import * as projectsApi from '../lib/api/projects';
import * as collectionsApi from '../lib/api/collections';
import * as requestsApi from '../lib/api/requests';

export interface CollectionsSlice {
  projects: ApiProject[];
  activeProjectId: string | null;
  activeCollectionId: string | null;
  activeRequestId: string | null;
  setActiveProject: (projectId: string) => void;
  setActiveCollection: (collectionId: string) => void;
  setActiveRequest: (requestId: string) => void;
  createProject: (name: string) => Promise<ApiProject>;
  createCollection: (projectId: string, name: string) => Promise<ApiCollection | undefined>;
  createRequest: (collectionId: string, request: Partial<ApiRequest>) => Promise<ApiRequest | undefined>;
  updateRequest: (requestId: string, updater: (request: ApiRequest) => ApiRequest) => Promise<void>;
  duplicateRequest: (requestId: string) => Promise<ApiRequest | undefined>;
  saveExample: (requestId: string, example: Omit<ApiExample, 'id' | 'createdAt'> & { responseBody?: string }) => Promise<ApiExample | undefined>;
  reorderCollections: (projectId: string, orderedIds: string[]) => Promise<void>;
  reorderRequests: (collectionId: string, orderedIds: string[]) => Promise<void>;
}

function updateCollectionRequest(collection: ApiCollection, requestId: string, updater: (request: ApiRequest) => ApiRequest) {
  collection.requests = collection.requests.map((request) => (request.id === requestId ? updater(request) : request));
}

export const createCollectionsSlice: StateCreator<AppState, [], [], CollectionsSlice> = (set, get) => ({
  projects: [],
  activeProjectId: null,
  activeCollectionId: null,
  activeRequestId: null,
  setActiveProject(projectId) {
    set((state) => {
      state.activeProjectId = projectId;
      const project = state.projects.find((item) => item.id === projectId);
      state.activeCollectionId = project?.collections[0]?.id ?? null;
      state.activeRequestId = project?.collections[0]?.requests[0]?.id ?? null;
    });
  },
  setActiveCollection(collectionId) {
    set((state) => {
      state.activeCollectionId = collectionId;
      const project = state.projects.find((item) => item.id === state.activeProjectId);
      const collection = project?.collections.find((item) => item.id === collectionId);
      state.activeRequestId = collection?.requests[0]?.id ?? null;
    });
  },
  setActiveRequest(requestId) {
    set((state) => {
      state.activeRequestId = requestId;
    });
  },
  async createProject(name) {
    const tempId = createId();
    const project: ApiProject = {
      id: tempId,
      name,
      collections: []
    };
    // Optimistic update
    set((state) => {
      state.projects.push(project);
      state.activeProjectId = project.id;
      state.activeCollectionId = null;
      state.activeRequestId = null;
    });
    try {
      const savedProject = await projectsApi.createProject(name);
      set((state) => {
        const index = state.projects.findIndex((p) => p.id === tempId);
        if (index !== -1) {
          state.projects[index] = savedProject;
          state.activeProjectId = savedProject.id;
        }
      });
      return savedProject;
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.projects = state.projects.filter((p) => p.id !== tempId);
        state.activeProjectId = state.projects[0]?.id ?? null;
      });
      throw error;
    }
  },
  async createCollection(projectId, name) {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return undefined;
    const tempId = createId();
    const collection: ApiCollection = {
      id: tempId,
      name,
      description: '',
      folders: [],
      requests: [],
      tags: []
    };
    // Optimistic update
    set((state) => {
      const target = state.projects.find((item) => item.id === projectId);
      if (!target) return;
      target.collections.push(collection);
      state.activeCollectionId = collection.id;
    });
    try {
      const savedCollection = await collectionsApi.createCollection(projectId, { name });
      set((state) => {
        const target = state.projects.find((item) => item.id === projectId);
        if (!target) return;
        const index = target.collections.findIndex((c) => c.id === tempId);
        if (index !== -1) {
          target.collections[index] = savedCollection;
          state.activeCollectionId = savedCollection.id;
        }
      });
      return savedCollection;
    } catch (error) {
      // Rollback on error
      set((state) => {
        const target = state.projects.find((item) => item.id === projectId);
        if (target) {
          target.collections = target.collections.filter((c) => c.id !== tempId);
        }
      });
      throw error;
    }
  },
  async createRequest(collectionId, request) {
    const collection = get().projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
    if (!collection) return undefined;
    const tempId = createId();
    const requestRecord: ApiRequest = {
      id: tempId,
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
    // Optimistic update
    set((state) => {
      const target = state.projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
      target?.requests.push(requestRecord);
      state.activeRequestId = requestRecord.id;
    });
    try {
      const savedRequest = await requestsApi.createRequest(collectionId, request);
      set((state) => {
        const target = state.projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
        if (target) {
          const index = target.requests.findIndex((r) => r.id === tempId);
          if (index !== -1) {
            target.requests[index] = savedRequest;
            state.activeRequestId = savedRequest.id;
          }
        }
      });
      return savedRequest;
    } catch (error) {
      // Rollback on error
      set((state) => {
        const target = state.projects.flatMap((project) => project.collections).find((item) => item.id === collectionId);
        if (target) {
          target.requests = target.requests.filter((r) => r.id !== tempId);
        }
      });
      throw error;
    }
  },
  async updateRequest(requestId, updater) {
    const currentRequest = get()
      .projects.flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests)
      .find((r) => r.id === requestId);
    if (!currentRequest) return;
    const updated = updater(currentRequest);
    // Optimistic update
    set((state) => {
      state.projects.forEach((project) => {
        project.collections.forEach((collection) => {
          updateCollectionRequest(collection, requestId, updater);
        });
      });
    });
    try {
      await requestsApi.updateRequest(requestId, updated);
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.projects.forEach((project) => {
          project.collections.forEach((collection) => {
            updateCollectionRequest(collection, requestId, () => currentRequest);
          });
        });
      });
      throw error;
    }
  },
  async duplicateRequest(requestId) {
    const collection = get()
      .projects.flatMap((project) => project.collections)
      .find((item) => item.requests.some((request) => request.id === requestId));
    if (!collection) return undefined;
    const original = collection.requests.find((request) => request.id === requestId);
    if (!original) return undefined;
    const tempId = createId();
    const clone: ApiRequest = {
      ...original,
      id: tempId,
      name: `${original.name} copy`,
      examples: original.examples.map((example) => ({ ...example, id: createId() }))
    };
    // Optimistic update
    set((state) => {
      const target = state.projects
        .flatMap((project) => project.collections)
        .find((item) => item.id === collection.id);
      target?.requests.push(clone);
      state.activeRequestId = clone.id;
    });
    try {
      const savedClone = await requestsApi.duplicateRequest(requestId);
      set((state) => {
        const target = state.projects
          .flatMap((project) => project.collections)
          .find((item) => item.id === collection.id);
        if (target) {
          const index = target.requests.findIndex((r) => r.id === tempId);
          if (index !== -1) {
            target.requests[index] = savedClone;
            state.activeRequestId = savedClone.id;
          }
        }
      });
      return savedClone;
    } catch (error) {
      // Rollback on error
      set((state) => {
        const target = state.projects
          .flatMap((project) => project.collections)
          .find((item) => item.id === collection.id);
        if (target) {
          target.requests = target.requests.filter((r) => r.id !== tempId);
        }
      });
      throw error;
    }
  },
  async saveExample(requestId, example) {
    const tempId = createId();
    const record: ApiExample = {
      id: tempId,
      createdAt: new Date().toISOString(),
      name: example.name,
      description: example.description,
      responseBody: example.responseBody,
      responseHeaders: example.responseHeaders,
      status: example.status
    };
    // Optimistic update
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
    try {
      const savedExample = await requestsApi.saveExample(requestId, example);
      set((state) => {
        state.projects.forEach((project) => {
          project.collections.forEach((collection) => {
            updateCollectionRequest(collection, requestId, (request) => {
              const examples = request.examples.filter((e) => e.id !== tempId);
              return { ...request, examples: [...examples, savedExample] };
            });
          });
        });
      });
      return savedExample;
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.projects.forEach((project) => {
          project.collections.forEach((collection) => {
            updateCollectionRequest(collection, requestId, (request) => ({
              ...request,
              examples: request.examples.filter((e) => e.id !== tempId)
            }));
          });
        });
      });
      throw error;
    }
  },
  async reorderCollections(projectId, orderedIds) {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    const originalOrder = [...project.collections];
    // Optimistic update
    set((state) => {
      const target = state.projects.find((item) => item.id === projectId);
      if (!target) return;
      target.collections = orderedIds
        .map((id) => target.collections.find((collection) => collection.id === id))
        .filter((collection): collection is ApiCollection => Boolean(collection));
    });
    try {
      await collectionsApi.reorderCollections(projectId, orderedIds);
    } catch (error) {
      // Rollback on error
      set((state) => {
        const target = state.projects.find((item) => item.id === projectId);
        if (target) {
          target.collections = originalOrder;
        }
      });
      throw error;
    }
  },
  async reorderRequests(collectionId, orderedIds) {
    const collection = get()
      .projects.flatMap((project) => project.collections)
      .find((item) => item.id === collectionId);
    if (!collection) return;
    const originalOrder = [...collection.requests];
    // Optimistic update
    set((state) => {
      const target = state.projects
        .flatMap((project) => project.collections)
        .find((item) => item.id === collectionId);
      if (!target) return;
      target.requests = orderedIds
        .map((id) => target.requests.find((request) => request.id === id))
        .filter((request): request is ApiRequest => Boolean(request));
    });
    try {
      await requestsApi.reorderRequests(collectionId, orderedIds);
    } catch (error) {
      // Rollback on error
      set((state) => {
        const target = state.projects
          .flatMap((project) => project.collections)
          .find((item) => item.id === collectionId);
        if (target) {
          target.requests = originalOrder;
        }
      });
      throw error;
    }
  }
});
