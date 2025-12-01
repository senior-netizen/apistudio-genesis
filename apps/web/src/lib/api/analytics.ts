import { apiFetch } from './client';

export interface PerformanceMetrics {
  endpointId?: string;
  latencyMs?: number;
  throughputPerMinute?: number;
  p95LatencyMs?: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  errorRate?: number;
  recommendations?: string[];
}

export interface UsageSummary {
  count: number;
  window: string;
}

export interface ErrorMetric {
  timestamp: string;
  count: number;
  message?: string;
}

export async function fetchPerformanceMetrics(): Promise<PerformanceMetrics> {
  const response = await apiFetch('/analytics/performance', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load performance metrics');
  }
  return response.json();
}

export async function fetchUsageRequests(): Promise<UsageSummary[]> {
  const response = await apiFetch('/usage/requests', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load usage');
  }
  return response.json();
}

export async function fetchErrorAnalytics(): Promise<ErrorMetric[]> {
  const response = await apiFetch('/analytics/errors', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load error analytics');
  }
  return response.json();
}
