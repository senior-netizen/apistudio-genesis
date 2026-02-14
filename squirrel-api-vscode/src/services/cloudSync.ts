/**
 * @squirrel/vscode - Cloud synchronization utilities.
 */

import axios from "axios";
import * as vscode from "vscode";
import { ApiProject, HistoryAnalyticsSnapshot } from "../types/api";

interface CloudSyncConfig {
  enabled: boolean;
  endpoint?: string;
  token?: string;
  workspaceId?: string;
  timeoutMs: number;
  retries: number;
}

const configurationNamespace = "@squirrel.vscode";
const output = vscode.window.createOutputChannel("Squirrel Cloud Sync");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCloudConfig = (): CloudSyncConfig => {
  const config = vscode.workspace.getConfiguration(configurationNamespace);
  return {
    enabled: config.get<boolean>("cloudSync.enable", false),
    endpoint: config.get<string>("cloudSync.endpoint"),
    token: config.get<string>("cloudSync.token"),
    workspaceId: config.get<string>("cloudSync.workspaceId"),
    timeoutMs: config.get<number>("cloudSync.timeoutMs", 8000),
    retries: config.get<number>("cloudSync.retries", 2),
  };
};

const getConfigValidationError = (config: CloudSyncConfig): string | null => {
  if (!config.enabled) return "cloud sync disabled";
  if (!config.endpoint) return "cloudSync.endpoint missing";
  if (!config.token) return "cloudSync.token missing";
  return null;
};

const postToCloud = async (route: string, payload: unknown): Promise<boolean> => {
  const config = getCloudConfig();
  const validationError = getConfigValidationError(config);
  if (validationError) {
    output.appendLine(`[cloud-sync] Skip ${route}: ${validationError}.`);
    return false;
  }

  const url = `${config.endpoint!.replace(/\/$/, "")}${route}`;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          ...(config.workspaceId ? { "X-Workspace": config.workspaceId } : {}),
        },
        timeout: config.timeoutMs,
      });
      output.appendLine(`[cloud-sync] Synced ${route} (attempt ${attempt + 1}/${config.retries + 1}).`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[cloud-sync] Failed ${route} (attempt ${attempt + 1}/${config.retries + 1}): ${message}`);
      if (attempt < config.retries) {
        await delay(Math.min(5000, 300 * 2 ** attempt));
      }
    }
  }

  return false;
};

export const syncProjectsToCloud = async (projects: ApiProject[]): Promise<boolean> =>
  postToCloud("/workspaces/projects", { projects });

export const uploadAnalyticsSnapshot = async (
  analytics: HistoryAnalyticsSnapshot
): Promise<boolean> => postToCloud("/workspaces/analytics", { analytics });
