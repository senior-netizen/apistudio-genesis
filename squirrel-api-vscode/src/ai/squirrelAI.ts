/**
 * @squirrel/vscode - Squirrel AI assistant bridge.
 * Uses remote AI when configured and gracefully falls back to deterministic offline responses.
 */

import axios from "axios";
import * as vscode from "vscode";
import { createHash } from "crypto";
import { AiCommand } from "../types/api";

const commandResponses: Record<AiCommand, string> = {
  analyzeResponse:
    "The response appears consistent. Consider validating schema constraints and ensuring latency budgets are respected.",
  suggestFix:
    "Try refining request headers, double-check authentication scopes, and retry with a smaller payload to isolate the issue.",
  generateRequest:
    "Here's a recommended request shape: GET /health with optional query filters and Authorization bearer token.",
  explainError:
    "Review the status code details and compare against your API contract; authentication or validation errors are most common.",
};

interface AiConfig {
  endpoint?: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  fallbackEnabled: boolean;
  remoteEnabled: boolean;
  remoteRolloutPercentage: number;
  telemetryEnabled: boolean;
}

const configNamespace = "@squirrel.vscode";

const output = vscode.window.createOutputChannel("Squirrel AI");

const toRolloutPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(0, Math.floor(value)));
};

const emitTelemetry = (event: string, payload: Record<string, unknown>, enabled: boolean) => {
  if (!enabled) return;
  output.appendLine(`[ai:telemetry] ${event} ${JSON.stringify(payload)}`);
};

const shouldUseRemote = (command: AiCommand, config: AiConfig): boolean => {
  if (!config.remoteEnabled) return false;
  const machineId = vscode.env?.machineId ?? 'unknown-machine';
  const bucketSeed = `${machineId}:${command}:${config.model}`;
  const hash = createHash('sha256').update(bucketSeed).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < config.remoteRolloutPercentage;
};

const getAiConfig = (): AiConfig => {
  const config = vscode.workspace.getConfiguration(configNamespace);
  return {
    endpoint: config.get<string>("ai.endpoint"),
    apiKey: config.get<string>("ai.apiKey"),
    model: config.get<string>("ai.model", "squirrel-general-v1"),
    timeoutMs: config.get<number>("ai.timeoutMs", 10000),
    fallbackEnabled: config.get<boolean>("ai.fallbackEnabled", true),
    remoteEnabled: config.get<boolean>("ai.remoteEnabled", true),
    remoteRolloutPercentage: toRolloutPercentage(config.get<number>("ai.remoteRolloutPercentage", 100)),
    telemetryEnabled: config.get<boolean>("ai.telemetryEnabled", true),
  };
};

const buildOfflineFallback = (command: AiCommand, context: Record<string, unknown>): string => {
  const base = commandResponses[command] ?? "AI command not recognized yet.";
  const hint = context?.summary ? `

Context summary: ${String(context.summary)}` : "";
  return `${base}${hint}`;
};

const runRemoteAiCommand = async (command: AiCommand, context: Record<string, unknown>, config: AiConfig): Promise<string | null> => {
  if (!config.endpoint || !config.apiKey) {
    return null;
  }
  if (!shouldUseRemote(command, config)) {
    output.appendLine('[ai] Remote AI skipped by rollout controls.');
    emitTelemetry('remote.skip.rollout', { command, remoteRolloutPercentage: config.remoteRolloutPercentage }, config.telemetryEnabled);
    return null;
  }

  const url = `${config.endpoint.replace(/\/$/, "")}/ai/assist`;
  const startedAt = Date.now();

  try {
    const response = await axios.post<{ output?: string }>(
      url,
      {
        command,
        context,
        model: config.model,
      },
      {
        timeout: config.timeoutMs,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data?.output?.trim();
    if (!content) {
      output.appendLine(`[ai] Empty response from remote endpoint (${url}).`);
      return null;
    }

    const latencyMs = Date.now() - startedAt;
    output.appendLine(`[ai] Remote command ${command} completed in ${latencyMs}ms.`);
    emitTelemetry('remote.success', { command, latencyMs }, config.telemetryEnabled);
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[ai] Remote command ${command} failed (${url}): ${message}`);
    emitTelemetry('remote.failure', { command, message }, config.telemetryEnabled);
    return null;
  }
};

export const runAiCommand = async (command: AiCommand, context: Record<string, unknown>): Promise<string> => {
  const config = getAiConfig();
  const remote = await runRemoteAiCommand(command, context, config);
  if (remote) {
    return remote;
  }

  if (!config.fallbackEnabled) {
    emitTelemetry('fallback.disabled', { command }, config.telemetryEnabled);
    return "AI endpoint unavailable and local fallback is disabled. Configure @squirrel.vscode.ai.* settings.";
  }

  emitTelemetry('fallback.local', { command }, config.telemetryEnabled);
  return buildOfflineFallback(command, context);
};
