/**
 * @squirrel/vscode - Squirrel AI assistant bridge.
 * Provides deterministic offline responses until the cloud endpoint is available.
 */

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

export const runAiCommand = async (command: AiCommand, context: Record<string, unknown>): Promise<string> => {
  const base = commandResponses[command] ?? "AI command not recognized yet.";
  const hint = context?.summary ? `\n\nContext summary: ${String(context.summary)}` : "";
  return `${base}${hint}`;
};
