import { create } from '@/vendor/zustand';
import { immer } from '@/vendor/zustand/middleware/immer';
import { subscribeWithSelector } from '@/vendor/zustand/middleware';
import type { AppState } from './types';
import { createCollectionsSlice } from './collectionsSlice';
import { createRequestSlice } from './requestSlice';
import { createResponseSlice } from './responseSlice';
import { createEnvironmentsSlice } from './environmentsSlice';
import { createHistorySlice } from './historySlice';
import { createMocksSlice } from './mocksSlice';
import { loadWorkspace } from '../lib/storage/indexedDb';
import type { WorkspaceBundle } from '../types/api';
import { createSubscriptionSlice } from './subscriptionSlice';
import { createCollaborationSlice, createInitialCollaborationState } from './collaborationSlice';
import { createCollectionPermissionsSlice } from './collectionPermissionsSlice';

export const useAppStore = create<AppState>(
  subscribeWithSelector(
    immer((set, get, api) => ({
      initialized: false,
      initializing: false,
      initializationError: null,
      globalVariables: [],
      async initialize() {
        if (get().initializing || get().initialized) return;
        set((state) => {
          state.initializing = true;
          state.initializationError = null;
        });

        let bundle: WorkspaceBundle | undefined;
        let loadError: string | null = null;
        try {
          bundle = await loadWorkspace();
        } catch (error) {
          loadError = error instanceof Error ? error.message : 'Unable to load workspace';
        }

        const resolvedBundle = bundle ?? { version: 1, projects: [], environments: [], history: [], mocks: [] };
        set((state) => {
          state.projects = resolvedBundle.projects;
          state.environments = resolvedBundle.environments;
          state.history = resolvedBundle.history;
          state.mocks = resolvedBundle.mocks;
          state.collaboration = resolvedBundle.collaboration ?? createInitialCollaborationState();
          state.activeProjectId = resolvedBundle.projects[0]?.id ?? null;
          state.activeCollectionId = resolvedBundle.projects[0]?.collections[0]?.id ?? null;
          state.activeRequestId = resolvedBundle.projects[0]?.collections[0]?.requests[0]?.id ?? null;
          state.activeEnvironmentId =
            resolvedBundle.environments.find((env) => env.isDefault)?.id ?? resolvedBundle.environments[0]?.id ?? null;
          state.globalVariables = [];
          state.initialized = true;
          state.initializing = false;
          state.initializationError = loadError;
        });
        get().restoreRequestTabs();
        const request = get()
          .projects.flatMap((project) => project.collections)
          .flatMap((collection) => collection.requests)
          .find((item) => item.id === get().activeRequestId);
        if (request) {
          get().loadRequest(request);
        } else {
          get().createBlankWorkingRequest();
        }
        void get().fetchSubscription();
        void get().fetchPlans();
        void get().syncCollaboration();
        get().connectCollaborationSocket();
      },
      ...createCollectionsSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createResponseSlice(set, get, api),
      ...createEnvironmentsSlice(set, get, api),
      ...createHistorySlice(set, get, api),
      ...createMocksSlice(set, get, api),
      ...createSubscriptionSlice(set, get, api),
      ...createCollaborationSlice(set, get, api),
      ...createCollectionPermissionsSlice(set, get, api)
    }))
  )
);
