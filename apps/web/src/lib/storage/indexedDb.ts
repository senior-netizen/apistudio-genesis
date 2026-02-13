import type { WorkspaceBundle } from "../../types/api";
import { fetchHistory, fetchWorkspaceBundle } from "../api/workspace";

export async function loadWorkspace(): Promise<WorkspaceBundle | undefined> {
  try {
    const [workspace, history] = await Promise.all([
      fetchWorkspaceBundle(),
      fetchHistory(),
    ]);
    return { ...workspace, history };
  } catch (err) {
    console.warn("[storage] Failed to load workspace from backend", err);
    return undefined;
  }
}

// Persisting full workspace locally is deprecated; the backend is the source of truth.
export async function persistWorkspace(_bundle: WorkspaceBundle) {
  console.info(
    "[storage] Workspace persistence skipped; using backend data only.",
  );
}

export async function exportWorkspace(): Promise<WorkspaceBundle> {
  const bundle = await loadWorkspace();
  if (!bundle) {
    return {
      version: 1,
      projects: [],
      environments: [],
      history: [],
      mocks: [],
      collaboration: undefined,
    };
  }
  return bundle;
}

export async function importWorkspace(bundle: WorkspaceBundle) {
  console.warn(
    "[storage] Local workspace import is disabled. Use the backend import API with an explicit workspace id.",
  );
  await persistWorkspace(bundle);
}
