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
  dryRun: boolean;
  telemetryEnabled: boolean;
  maxConsecutiveFailures: number;
  cooldownMs: number;
}

const configurationNamespace = "@squirrel.vscode";
const output = vscode.window.createOutputChannel("Squirrel Cloud Sync");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let consecutiveFailures = 0;
let cooldownUntil = 0;

const emitTelemetry = (event: string, payload: Record<string, unknown>, enabled: boolean) => {
  if (!enabled) return;
  output.appendLine(`[cloud-sync:telemetry] ${event} ${JSON.stringify(payload)}`);
};

const getCloudConfig = (): CloudSyncConfig => {
  const config = vscode.workspace.getConfiguration(configurationNamespace);
  return {
    enabled: config.get<boolean>("cloudSync.enable", false),
    endpoint: config.get<string>("cloudSync.endpoint"),
    token: config.get<string>("cloudSync.token"),
    workspaceId: config.get<string>("cloudSync.workspaceId"),
    timeoutMs: config.get<number>("cloudSync.timeoutMs", 8000),
    retries: config.get<number>("cloudSync.retries", 2),
    dryRun: config.get<boolean>("cloudSync.dryRun", false),
    telemetryEnabled: config.get<boolean>("cloudSync.telemetryEnabled", true),
    maxConsecutiveFailures: Math.max(1, config.get<number>("cloudSync.maxConsecutiveFailures", 3)),
    cooldownMs: Math.max(0, config.get<number>("cloudSync.cooldownMs", 30000)),
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
  if (Date.now() < cooldownUntil) {
    const msRemaining = cooldownUntil - Date.now();
    output.appendLine(`[cloud-sync] Skip ${route}: cooling down for ${msRemaining}ms after repeated failures.`);
    emitTelemetry('cooldown.skip', { route, msRemaining }, config.telemetryEnabled);
    return false;
  }
  if (validationError) {
    output.appendLine(`[cloud-sync] Skip ${route}: ${validationError}.`);
    emitTelemetry('validation.skip', { route, validationError }, config.telemetryEnabled);
    return false;
  }

  const url = `${config.endpoint!.replace(/\/$/, "")}${route}`;

  if (config.dryRun) {
    output.appendLine(`[cloud-sync] Dry run enabled, skipping POST ${route}.`);
    emitTelemetry('dryrun.skip', { route }, config.telemetryEnabled);
    return true;
  }

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
      consecutiveFailures = 0;
      cooldownUntil = 0;
      emitTelemetry('sync.success', { route, attempt: attempt + 1 }, config.telemetryEnabled);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[cloud-sync] Failed ${route} (attempt ${attempt + 1}/${config.retries + 1}): ${message}`);
      emitTelemetry('sync.failure', { route, attempt: attempt + 1, message }, config.telemetryEnabled);
      if (attempt < config.retries) {
        await delay(Math.min(5000, 300 * 2 ** attempt));
      }
    }
  }

  consecutiveFailures += 1;
  if (consecutiveFailures >= config.maxConsecutiveFailures) {
    cooldownUntil = Date.now() + config.cooldownMs;
    emitTelemetry('cooldown.enter', { cooldownMs: config.cooldownMs, consecutiveFailures }, config.telemetryEnabled);
  }

  return false;
};

export const syncProjectsToCloud = async (projects: ApiProject[]): Promise<boolean> =>
  postToCloud("/workspaces/projects", { projects });

export const uploadAnalyticsSnapshot = async (
  analytics: HistoryAnalyticsSnapshot
): Promise<boolean> => postToCloud("/workspaces/analytics", { analytics });
