import type { StateCreator } from '@/vendor/zustand';
import type { ApiEnvironment } from '../types/api';
import { createId } from './utils';
import type { AppState } from './types';
import * as environmentsApi from '../lib/api/environments';

export interface EnvironmentsSlice {
  environments: ApiEnvironment[];
  activeEnvironmentId: string | null;
  setActiveEnvironment: (id: string | null) => void;
  addEnvironment: (environment: Omit<ApiEnvironment, 'id'>) => Promise<ApiEnvironment>;
  updateEnvironment: (id: string, updater: (environment: ApiEnvironment) => ApiEnvironment) => Promise<void>;
}

export const createEnvironmentsSlice: StateCreator<AppState, [], [], EnvironmentsSlice> = (set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  setActiveEnvironment(id) {
    set((state) => {
      state.activeEnvironmentId = id;
    });
  },
  async addEnvironment(environment) {
    const tempId = createId();
    const record: ApiEnvironment = { ...environment, id: tempId };
    // Optimistic update
    set((state) => {
      state.environments.push(record);
      if (environment.isDefault) {
        state.environments.forEach((env) => {
          if (env.id !== tempId) env.isDefault = false;
        });
        state.activeEnvironmentId = tempId;
      }
    });
    try {
      const saved = await environmentsApi.createEnvironment(environment);
      set((state) => {
        const index = state.environments.findIndex((e) => e.id === tempId);
        if (index !== -1) {
          state.environments[index] = saved;
          if (saved.isDefault) {
            state.activeEnvironmentId = saved.id;
          }
        }
      });
      return saved;
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.environments = state.environments.filter((e) => e.id !== tempId);
      });
      throw error;
    }
  },
  async updateEnvironment(id, updater) {
    const current = get().environments.find((env) => env.id === id);
    if (!current) return;
    const updated = updater(current);
    // Optimistic update
    set((state) => {
      state.environments = state.environments.map((env) => (env.id === id ? updated : env));
      if (updated.isDefault) {
        state.environments.forEach((env) => {
          if (env.id !== id) env.isDefault = false;
        });
        state.activeEnvironmentId = id;
      }
    });
    try {
      await environmentsApi.updateEnvironment(id, updated);
    } catch (error) {
      // Rollback on error
      set((state) => {
        state.environments = state.environments.map((env) => (env.id === id ? current : env));
      });
      throw error;
    }
  },
});
