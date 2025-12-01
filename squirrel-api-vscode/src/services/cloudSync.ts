/**
 * @squirrel/vscode - Optional cloud synchronization utilities.
 * These helpers target future Squirrel Cloud endpoints for projects and analytics.
 */

import axios from "axios";
import * as vscode from "vscode";
import { ApiProject, HistoryAnalyticsSnapshot } from "../types/api";

interface CloudSyncConfig {
  enabled: boolean;
  endpoint?: string;
  token?: string;
  workspaceId?: string;
}

const configurationNamespace = "@squirrel.vscode";

const getCloudConfig = (): CloudSyncConfig => {
  const config = vscode.workspace.getConfiguration(configurationNamespace);
  return {
    enabled: config.get<boolean>("cloudSync.enable", false),
    endpoint: config.get<string>("cloudSync.endpoint"),
    token: config.get<string>("cloudSync.token"),
    workspaceId: config.get<string>("cloudSync.workspaceId"),
  };
};

const postToCloud = async (route: string, payload: unknown): Promise<boolean> => {
  const config = getCloudConfig();
  if (!config.enabled || !config.endpoint || !config.token) {
    return false;
  }

  const url = `${config.endpoint.replace(/\/$/, "")}${route}`;

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...(config.workspaceId ? { "X-Workspace": config.workspaceId } : {}),
      },
      timeout: 8000,
    });
    return true;
  } catch (error) {
    const output = vscode.window.createOutputChannel("Squirrel Cloud Sync");
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[cloud-sync] Failed to post to ${url}: ${message}`);
    output.dispose();
    return false;
  }
};

export const syncProjectsToCloud = async (projects: ApiProject[]): Promise<boolean> =>
  postToCloud("/workspaces/projects", { projects });

export const uploadAnalyticsSnapshot = async (
  analytics: HistoryAnalyticsSnapshot
): Promise<boolean> => postToCloud("/workspaces/analytics", { analytics });

