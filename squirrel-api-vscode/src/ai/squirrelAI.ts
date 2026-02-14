/**
 * @squirrel/vscode - Squirrel AI assistant bridge.
 * Uses remote AI when configured and gracefully falls back to deterministic offline responses.
 */

import axios from "axios";
import * as vscode from "vscode";
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
}

const configNamespace = "@squirrel.vscode";

const output = vscode.window.createOutputChannel("Squirrel AI");

const getAiConfig = (): AiConfig => {
  const config = vscode.workspace.getConfiguration(configNamespace);
  return {
    endpoint: config.get<string>("ai.endpoint"),
    apiKey: config.get<string>("ai.apiKey"),
    model: config.get<string>("ai.model", "squirrel-general-v1"),
    timeoutMs: config.get<number>("ai.timeoutMs", 10000),
    fallbackEnabled: config.get<boolean>("ai.fallbackEnabled", true),
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

    output.appendLine(`[ai] Remote command ${command} completed in ${Date.now() - startedAt}ms.`);
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[ai] Remote command ${command} failed (${url}): ${message}`);
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
    return "AI endpoint unavailable and local fallback is disabled. Configure @squirrel.vscode.ai.* settings.";
  }

  return buildOfflineFallback(command, context);
};
