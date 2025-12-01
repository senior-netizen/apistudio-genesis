/**
 * @squirrel/vscode - Storage utilities encapsulating VS Code's global state and secret store.
 * Provides helpers to persist request history, environment metadata, and secure variables.
 */

import * as vscode from "vscode";
import { ApiHistoryEntry, EnvironmentDefinition } from "../types/api";

const HISTORY_KEY = "@squirrel/vscode/history";
const ENVIRONMENT_META_KEY = "@squirrel/vscode/env/meta";
const PROJECTS_KEY = "@squirrel/vscode/projects";
const AUTH_META_KEY = "@squirrel/vscode/auth/meta";
const ANALYTICS_KEY = "@squirrel/vscode/analytics";

let context: vscode.ExtensionContext | undefined;

interface EnvironmentMetadata {
  id: string;
  name: string;
  isDefault?: boolean;
}

const secretKey = (id: string) => `@squirrel/vscode/env/${id}`;
const authSecretKey = (id: string) => `@squirrel/vscode/auth/${id}`;

export const initializeStorage = (ctx: vscode.ExtensionContext) => {
  context = ctx;
};

const ensureContext = (): vscode.ExtensionContext => {
  if (!context) {
    throw new Error("Storage utilities accessed before initialization.");
  }
  return context;
};

export const getHistory = async (): Promise<ApiHistoryEntry[]> => {
  const ctx = ensureContext();
  const stored = ctx.globalState.get<ApiHistoryEntry[]>(HISTORY_KEY, []);
  return stored ?? [];
};

export const addHistoryEntry = async (entry: ApiHistoryEntry): Promise<void> => {
  const ctx = ensureContext();
  const history = await getHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 50);
  await ctx.globalState.update(HISTORY_KEY, trimmed);
};

export const clearHistory = async (): Promise<void> => {
  const ctx = ensureContext();
  await ctx.globalState.update(HISTORY_KEY, []);
};

export const getProjectsState = async <T = unknown>(): Promise<T[]> => {
  const ctx = ensureContext();
  const stored = ctx.globalState.get<T[]>(PROJECTS_KEY, []);
  return stored ?? [];
};

export const saveProjectsState = async <T = unknown>(projects: T[]): Promise<void> => {
  const ctx = ensureContext();
  await ctx.globalState.update(PROJECTS_KEY, projects);
};

export const getAuthMetadata = async <T = unknown>(): Promise<T[]> => {
  const ctx = ensureContext();
  const stored = ctx.globalState.get<T[]>(AUTH_META_KEY, []);
  return stored ?? [];
};

export const saveAuthMetadata = async <T = unknown>(items: T[]): Promise<void> => {
  const ctx = ensureContext();
  await ctx.globalState.update(AUTH_META_KEY, items);
};

export const getAnalyticsSnapshot = async <T = unknown>(fallback: T): Promise<T> => {
  const ctx = ensureContext();
  const stored = ctx.globalState.get<T>(ANALYTICS_KEY, fallback);
  return stored ?? fallback;
};

export const saveAnalyticsSnapshot = async <T = unknown>(snapshot: T): Promise<void> => {
  const ctx = ensureContext();
  await ctx.globalState.update(ANALYTICS_KEY, snapshot);
};

export const getEnvironments = async (): Promise<EnvironmentDefinition[]> => {
  const ctx = ensureContext();
  const meta = ctx.globalState.get<EnvironmentMetadata[]>(ENVIRONMENT_META_KEY, []) ?? [];
  const enriched = await Promise.all(
    meta.map(async (env) => {
      try {
        const secret = await ctx.secrets.get(secretKey(env.id));
        const variables = secret ? (JSON.parse(secret) as Record<string, string>) : {};
        return { ...env, variables } satisfies EnvironmentDefinition;
      } catch (error) {
        console.error("Failed to parse environment secret", error);
        return { ...env, variables: {} } satisfies EnvironmentDefinition;
      }
    })
  );
  return enriched;
};

export const saveEnvironments = async (environments: EnvironmentDefinition[]): Promise<void> => {
  const ctx = ensureContext();
  const meta: EnvironmentMetadata[] = environments.map(({ id, name, isDefault }) => ({
    id,
    name,
    isDefault,
  }));

  await ctx.globalState.update(ENVIRONMENT_META_KEY, meta);

  await Promise.all(
    environments.map(async (env) => {
      await ctx.secrets.store(secretKey(env.id), JSON.stringify(env.variables ?? {}));
    })
  );
};

export const deleteEnvironment = async (id: string): Promise<void> => {
  const ctx = ensureContext();
  const meta = ctx.globalState.get<EnvironmentMetadata[]>(ENVIRONMENT_META_KEY, []) ?? [];
  const filtered = meta.filter((env) => env.id !== id);
  await ctx.globalState.update(ENVIRONMENT_META_KEY, filtered);
  await ctx.secrets.delete(secretKey(id));
};

export const storeSecret = async (key: string, value: string): Promise<void> => {
  const ctx = ensureContext();
  await ctx.secrets.store(key, value);
};

export const getSecret = async (key: string): Promise<string | undefined> => {
  const ctx = ensureContext();
  return ctx.secrets.get(key);
};

export const deleteSecret = async (key: string): Promise<void> => {
  const ctx = ensureContext();
  await ctx.secrets.delete(key);
};

export const authSecretId = (id: string) => authSecretKey(id);
