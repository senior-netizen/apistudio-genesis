import { apiFetch } from "./client";

interface StructuredApiError {
  code?: string;
  message?: string;
  details?: unknown;
}

async function readStructuredError(
  response: Response,
  fallbackMessage: string,
): Promise<Error> {
  let payload: StructuredApiError | null = null;
  try {
    payload = (await response.json()) as StructuredApiError;
  } catch {
    payload = null;
  }

  if (payload?.message) {
    const error = new Error(payload.message);
    (
      error as Error & { code?: string; details?: unknown; status?: number }
    ).code = payload.code;
    (
      error as Error & { code?: string; details?: unknown; status?: number }
    ).details = payload.details;
    (
      error as Error & { code?: string; details?: unknown; status?: number }
    ).status = response.status;
    return error;
  }

  return new Error(fallbackMessage);
}

export async function fetchDiagnosticsSnapshot() {
  const response = await apiFetch("/diagnostics", { method: "GET" });
  if (!response.ok) {
    throw await readStructuredError(response, "Failed to load diagnostics");
  }
  return response.json();
}

export async function runDiagnosticsProbe(target?: string) {
  const response = await apiFetch("/diagnostics/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target ? { target } : {}),
  });
  if (!response.ok) {
    throw await readStructuredError(response, "Failed to run diagnostics");
  }
  return response.json();
}

export async function fetchHealthStatus() {
  const response = await apiFetch("/health", { method: "GET" });
  if (!response.ok) {
    throw await readStructuredError(response, "Failed to load health");
  }
  return response.json();
}
