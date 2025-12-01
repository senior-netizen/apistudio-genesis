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
import type { WorkspaceBundle } from '../types/api';
import { createSubscriptionSlice } from './subscriptionSlice';
import { createCollaborationSlice, createInitialCollaborationState } from './collaborationSlice';
import { loadWorkspaceBundle } from '../lib/data/loadWorkspaceBundle';

export const useAppStore = create<AppState>(
  subscribeWithSelector(
    immer((set, get, api) => ({
      initialized: false,
      initializing: false,
      async initialize() {
        if (get().initializing || get().initialized) return;
        set((state) => {
          state.initializing = true;
        });
        let bundle: WorkspaceBundle;
        try {
          bundle = await loadWorkspaceBundle();
        } catch (error) {
          set((state) => {
            state.initialized = true;
            state.initializing = false;
          });
          console.warn('[workspace] failed to load from backend', error);
          return;
        }
        set((state) => {
          state.projects = bundle.projects;
          state.activeWorkspaceId = bundle.workspaceId ?? bundle.projects[0]?.id ?? 'default-workspace';
          state.environments = bundle.environments;
          state.history = bundle.history;
          state.mocks = bundle.mocks;
          state.collaboration = bundle.collaboration ?? createInitialCollaborationState();
          state.activeProjectId = bundle.projects[0]?.id ?? null;
          state.activeCollectionId = bundle.projects[0]?.collections[0]?.id ?? null;
          state.activeRequestId = bundle.projects[0]?.collections[0]?.requests[0]?.id ?? null;
          state.activeEnvironmentId = bundle.environments.find((env) => env.isDefault)?.id ?? bundle.environments[0]?.id ?? null;
          state.globalVariables = [];
          state.initialized = true;
          state.initializing = false;
        });
        get().restoreRequestTabs();
        const request = get()
          .projects.flatMap((project) => project.collections)
          .flatMap((collection) => collection.requests)
          .find((item) => item.id === get().activeRequestId);
        get().loadRequest(request);
        void get().fetchSubscription();
        void get().fetchPlans();
        void get().syncCollaboration();
      },
      ...createCollectionsSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createResponseSlice(set, get, api),
      ...createEnvironmentsSlice(set, get, api),
      ...createHistorySlice(set, get, api),
      ...createMocksSlice(set, get, api),
      ...createSubscriptionSlice(set, get, api),
      ...createCollaborationSlice(set, get, api)
    }))
  )
);

