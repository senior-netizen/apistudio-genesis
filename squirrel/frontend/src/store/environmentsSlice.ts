import type { StateCreator } from '@/vendor/zustand';
import type { ApiEnvironment, Variable } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';

export interface EnvironmentsSlice {
  environments: ApiEnvironment[];
  globalVariables: Variable[];
  activeEnvironmentId: string | null;
  setActiveEnvironment: (id: string | null) => void;
  addEnvironment: (name: string) => ApiEnvironment;
  updateEnvironment: (id: string, updater: (environment: ApiEnvironment) => ApiEnvironment) => void;
  setGlobalVariables: (variables: Variable[]) => void;
}

export const createEnvironmentsSlice: StateCreator<AppState, [], [], EnvironmentsSlice> = (set, get, _api) => ({
  environments: [],
  globalVariables: [],
  activeEnvironmentId: null,
  setActiveEnvironment(id) {
    set((state) => {
      state.activeEnvironmentId = id;
    });
  },
  addEnvironment(name) {
    const environment: ApiEnvironment = {
      id: createId(),
      name,
      variables: [],
      isDefault: false
    };
    set((state) => {
      state.environments.push(environment);
      if (!state.activeEnvironmentId) {
        state.activeEnvironmentId = environment.id;
      }
    });
    return environment;
  },
  updateEnvironment(id, updater) {
    set((state) => {
      state.environments = state.environments.map((environment) =>
        environment.id === id ? updater(environment) : environment
      );
    });
  },
  setGlobalVariables(variables) {
    set((state) => {
      state.globalVariables = variables;
    });
  }
});
