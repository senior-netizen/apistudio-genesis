import { apiFetch } from './client';

export async function fetchDiagnosticsSnapshot() {
  const response = await apiFetch('/diagnostics', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load diagnostics');
  }
  return response.json();
}

export async function runDiagnosticsProbe(target?: string) {
  const response = await apiFetch('/diagnostics/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target ? { target } : {}),
  });
  if (!response.ok) {
    // TODO: backend should return structured errors consistently
    throw new Error('Failed to run diagnostics');
  }
  return response.json();
}

export async function fetchHealthStatus() {
  const response = await apiFetch('/health', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load health');
  }
  return response.json();
}
