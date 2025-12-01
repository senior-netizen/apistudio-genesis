import type { StateCreator } from '@/vendor/zustand';
import type { ApiRequest } from '../types/api';
import { resolveValue } from '../lib/env/resolveVars';
import { runSandboxedScript } from '../lib/scripts/runtime';
import { requestRunner } from '../lib/request/requestRunnerInstance';
import { buildVariableContext, mapToRunnerRequest } from '../lib/request/runnerAdapter';
import type { RunnerSuccessEvent } from '@sdl/request-runner';
import type { AppState } from './types';

type RequestEditorTab = { requestId: string; title: string; customTitle?: boolean };

const TABS_STORAGE_KEY = 'sdl.request-tabs';

function loadInitialTabs(): RequestEditorTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tab) => typeof tab?.requestId === 'string' && typeof tab?.title === 'string');
  } catch (error) {
    console.warn('Failed to load request tabs', error);
    return [];
  }
}

function persistTabs(tabs: RequestEditorTab[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch (error) {
    console.warn('Failed to persist request tabs', error);
  }
}

export type RequestTab = 'params' | 'headers' | 'body' | 'auth' | 'scripts';

export interface RequestSlice {
  workingRequest?: ApiRequest;
  lastSentRequest?: ApiRequest;
  unsavedChanges: boolean;
  selectedRequestTab: RequestTab;
  isSending: boolean;
  timeoutMs: number;
  retries: number;
  openRequestTabs: RequestEditorTab[];
  activeRequestTabId: string | null;
  loadRequest: (request: ApiRequest | undefined) => void;
  updateWorkingRequest: (updater: (request: ApiRequest) => ApiRequest) => void;
  persistWorkingRequest: () => void;
  revertWorkingRequest: () => void;
  setSelectedRequestTab: (tab: RequestTab) => void;
  setRequestOptions: (options: { timeoutMs?: number; retries?: number }) => void;
  restoreRequestTabs: () => void;
  activateRequestTab: (requestId: string) => void;
  closeRequestTab: (requestId: string) => void;
  renameRequestTab: (requestId: string, title: string) => void;
  duplicateRequestTab: (requestId: string) => void;
  moveRequestTab: (requestId: string, targetIndex: number) => void;
  sendRequest: () => Promise<void>;
}

export const createRequestSlice: StateCreator<AppState, [], [], RequestSlice> = (set, get, _api) => ({
  workingRequest: undefined,
  lastSentRequest: undefined,
  unsavedChanges: false,
  selectedRequestTab: 'params',
  isSending: false,
  timeoutMs: 30000,
  retries: 0,
  openRequestTabs: loadInitialTabs(),
  activeRequestTabId: null,
  loadRequest(request) {
    if (!request) {
      set((state) => {
        state.workingRequest = undefined;
      });
      return;
    }
    const copy: ApiRequest = JSON.parse(JSON.stringify(request));
    set((state) => {
      state.workingRequest = copy;
      state.unsavedChanges = false;
      const requestId = String(request.id);
      state.activeRequestTabId = requestId;
      const existing = state.openRequestTabs.find((tab) => tab.requestId === requestId);
      if (!existing) {
        state.openRequestTabs.push({ requestId, title: request.name, customTitle: false });
      } else if (!existing.customTitle) {
        existing.title = request.name;
      }
    });
    persistTabs(get().openRequestTabs);
  },
  updateWorkingRequest(updater) {
    set((state) => {
      if (!state.workingRequest) return;
      state.workingRequest = updater(state.workingRequest);
      state.unsavedChanges = true;
    });
  },
  persistWorkingRequest() {
    const { workingRequest } = get();
    if (!workingRequest) return;
    get().updateRequest(workingRequest.id, () => ({ ...workingRequest, lastRunAt: new Date().toISOString() }));
    set((state) => {
      state.lastSentRequest = workingRequest;
      state.unsavedChanges = false;
    });
  },
  revertWorkingRequest() {
    const { activeRequestId } = get();
    if (!activeRequestId) return;
    const collection = get()
      .projects.flatMap((project) => project.collections)
      .find((item) => item.requests.some((request) => request.id === activeRequestId));
    const original = collection?.requests.find((request) => request.id === activeRequestId);
    if (!original) return;
    const copy: ApiRequest = JSON.parse(JSON.stringify(original));
    set((state) => {
      state.workingRequest = copy;
      state.unsavedChanges = false;
    });
  },
  setSelectedRequestTab(tab) {
    set((state) => {
      state.selectedRequestTab = tab;
    });
  },
  setRequestOptions(options) {
    set((state) => {
      if (options.timeoutMs !== undefined) state.timeoutMs = options.timeoutMs;
      if (options.retries !== undefined) state.retries = options.retries;
    });
  },
  restoreRequestTabs() {
    const requests = get()
      .projects.flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests);
    set((state) => {
      state.openRequestTabs = state.openRequestTabs.filter((tab) =>
        requests.some((request) => String(request.id) === tab.requestId)
      );
      if (state.openRequestTabs.length === 0 && requests[0]) {
        const first = requests[0];
        state.openRequestTabs.push({ requestId: String(first.id), title: first.name, customTitle: false });
        state.activeRequestTabId = String(first.id);
        state.activeRequestId = String(first.id);
      } else if (state.openRequestTabs.length > 0) {
        const activeExists = state.openRequestTabs.some((tab) => tab.requestId === state.activeRequestTabId);
        if (!activeExists) {
          const first = state.openRequestTabs[0];
          state.activeRequestTabId = first.requestId;
          state.activeRequestId = first.requestId;
        }
      }
    });
    persistTabs(get().openRequestTabs);
  },
  activateRequestTab(requestId) {
    const target = get()
      .projects.flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests)
      .find((item) => String(item.id) === requestId);
    if (!target) return;
    set((state) => {
      state.activeRequestId = requestId;
      state.activeRequestTabId = requestId;
      const existing = state.openRequestTabs.find((tab) => tab.requestId === requestId);
      if (!existing) {
        state.openRequestTabs.push({ requestId, title: target.name, customTitle: false });
      } else if (!existing.customTitle) {
        existing.title = target.name;
      }
    });
    persistTabs(get().openRequestTabs);
  },
  closeRequestTab(requestId) {
    set((state) => {
      const index = state.openRequestTabs.findIndex((tab) => tab.requestId === requestId);
      if (index === -1) return;
      state.openRequestTabs.splice(index, 1);
      if (state.activeRequestTabId === requestId) {
        const nextTab = state.openRequestTabs[index] ?? state.openRequestTabs[index - 1];
        state.activeRequestTabId = nextTab ? nextTab.requestId : null;
        state.activeRequestId = nextTab ? nextTab.requestId : null;
        if (!nextTab) {
          state.workingRequest = undefined;
        }
      }
    });
    persistTabs(get().openRequestTabs);
  },
  renameRequestTab(requestId, title) {
    set((state) => {
      const tab = state.openRequestTabs.find((entry) => entry.requestId === requestId);
      if (!tab) return;
      tab.title = title.trim() || tab.title;
      tab.customTitle = true;
    });
    persistTabs(get().openRequestTabs);
  },
  duplicateRequestTab(requestId) {
    const clone = get().duplicateRequest(requestId);
    if (!clone) return;
    const cloneId = String(clone.id);
    set((state) => {
      state.activeRequestId = cloneId;
      state.activeRequestTabId = cloneId;
      state.openRequestTabs.push({ requestId: cloneId, title: clone.name, customTitle: false });
    });
    persistTabs(get().openRequestTabs);
  },
  moveRequestTab(requestId, targetIndex) {
    set((state) => {
      const currentIndex = state.openRequestTabs.findIndex((tab) => tab.requestId === requestId);
      if (currentIndex === -1) return;
      const [tab] = state.openRequestTabs.splice(currentIndex, 1);
      const clampedIndex = Math.max(0, Math.min(targetIndex, state.openRequestTabs.length));
      state.openRequestTabs.splice(clampedIndex, 0, tab);
    });
    persistTabs(get().openRequestTabs);
  },
  async sendRequest() {
    const state = get();
    const request = state.workingRequest;
    if (!request) return;

    const environment = state.environments.find((env) => env.id === state.activeEnvironmentId);
    const variableContext = buildVariableContext(state.globalVariables, environment, []);
    const runnerRequest = mapToRunnerRequest(request);
    const prepared = requestRunner.prepare(runnerRequest, variableContext);

    const requestInit: RequestInit & { url: string } = {
      method: prepared.method,
      headers: prepared.headers,
      url: prepared.url
    };

    set((draft) => {
      draft.isSending = true;
      draft.responseError = undefined;
      draft.response = undefined;
      draft.responseStream = '';
      draft.responseProgress = undefined;
    });

    const preRequestOutcome = await runSandboxedScript(request.scripts.preRequest, { request: requestInit }, 'pre-request');
    set((draft) => {
      draft.preRequestOutcome = preRequestOutcome;
    });

    const mockResponse = state.resolveMock(request.method, prepared.url);
    let unsubscribe: (() => void) | undefined;
    let streamBuffer = '';

    if (!mockResponse) {
      unsubscribe = requestRunner.on('request:progress', (event) => {
        if (event.requestId !== prepared.id) return;
        if (event.chunk) {
          streamBuffer += event.chunk;
        }
        set((draft) => {
          draft.responseStream = streamBuffer;
          draft.responseProgress = {
            receivedBytes: event.receivedBytes,
            totalBytes: event.totalBytes
          };
        });
      });
    }

    try {
      const resolvedUrl = resolveValue(request.url, {
        globals: state.globalVariables,
        environment,
        locals: []
      }).value;

      const finalUrl = mockResponse ? resolvedUrl : prepared.url;

      let responseSnapshot = mockResponse;
      let runnerResult: RunnerSuccessEvent | undefined;

      if (!mockResponse) {
        runnerResult = await requestRunner.run(runnerRequest, {
          timeoutMs: state.timeoutMs,
          retries: state.retries,
          variableContext
        });
        responseSnapshot = runnerResult.response;
      }

      if (responseSnapshot) {
        const testOutcome = await runSandboxedScript(
          request.scripts.test,
          { request: requestInit, response: responseSnapshot },
          'test'
        );
        set((draft) => {
          draft.response = responseSnapshot;
          draft.testOutcome = testOutcome;
          draft.responseError = undefined;
          draft.responseStream = undefined;
          draft.responseProgress = undefined;
        });
        state.persistWorkingRequest();
        state.addHistoryEntry({
          requestId: request.id,
          method: request.method,
          url: runnerResult?.request.url ?? finalUrl,
          status: responseSnapshot.status,
          duration: responseSnapshot.duration,
          timestamp: new Date().toISOString(),
          pinned: false
        });
      } else {
        set((draft) => {
          draft.response = undefined;
          draft.testOutcome = undefined;
          draft.responseError = 'Request failed';
        });
      }
    } catch (error) {
      set((draft) => {
        draft.response = undefined;
        draft.testOutcome = undefined;
        draft.responseError = error instanceof Error ? error.message : 'Request failed';
      });
    } finally {
      unsubscribe?.();
      set((draft) => {
        draft.isSending = false;
      });
    }
  }
});
