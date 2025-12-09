import type { StateCreator } from '@/vendor/zustand';
import type { ResponseSnapshot } from '../types/api';
import type { ScriptOutcome } from '../lib/scripts/runtime';
import type { AppState } from './types';

export interface ResponseSlice {
  response?: ResponseSnapshot;
  responseHistory: ResponseSnapshot[];
  responseError?: string;
  preRequestOutcome?: ScriptOutcome;
  testOutcome?: ScriptOutcome;
  responseStream?: string;
  responseProgress?: { receivedBytes: number; totalBytes?: number };
  setResponse: (response: ResponseSnapshot | undefined) => void;
  setResponseError: (message: string | undefined) => void;
  setPreRequestOutcome: (outcome: ScriptOutcome | undefined) => void;
  setTestOutcome: (outcome: ScriptOutcome | undefined) => void;
  setResponseStream: (body: string | undefined) => void;
  setResponseProgress: (progress: { receivedBytes: number; totalBytes?: number } | undefined) => void;
}

export const createResponseSlice: StateCreator<AppState, [], [], ResponseSlice> = (set) => ({
  response: undefined,
  responseHistory: [],
  responseError: undefined,
  preRequestOutcome: undefined,
  testOutcome: undefined,
  responseStream: undefined,
  responseProgress: undefined,
  setResponse(response) {
    set((state) => {
      state.response = response;
      if (response) {
        state.responseHistory.unshift(response);
        if (state.responseHistory.length > 5) {
          state.responseHistory.length = 5;
        }
      }
    });
  },
  setResponseError(message) {
    set((state) => {
      state.responseError = message;
    });
  },
  setPreRequestOutcome(outcome) {
    set((state) => {
      state.preRequestOutcome = outcome;
    });
  },
  setTestOutcome(outcome) {
    set((state) => {
      state.testOutcome = outcome;
    });
  },
  setResponseStream(body) {
    set((state) => {
      state.responseStream = body;
    });
  },
  setResponseProgress(progress) {
    set((state) => {
      state.responseProgress = progress;
    });
  }
});
