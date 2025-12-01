import { api } from '../../services/api';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  roles?: string[];
  activeWorkspaceId?: string | null;
  lastActiveAt?: string | null;
}

export interface AdminSystemHealthEntry {
  service: string;
  status: 'up' | 'down' | 'unknown';
  checkedAt: string;
  latencyMs?: number;
  detail?: unknown;
}

export interface AdminLogEntry {
  id?: string;
  level?: string;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdminBillingSnapshot {
  userId: string;
  plan?: string;
  credits?: number;
  usage?: Record<string, unknown> | null;
  history?: Array<Record<string, unknown>>;
}

export interface AdminSessionSnapshot {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  workspaceId?: string | null;
  connectedAt?: string;
  takeoverState?: Record<string, unknown> | null;
}

export async function fetchAdminUsers(search?: string): Promise<AdminUser[]> {
  const response = await api.get('/admin/users', { params: search ? { search } : undefined });
  return (response.data ?? []) as AdminUser[];
}

export async function updateAdminUserRole(userId: string, role: string): Promise<void> {
  await api.post(`/admin/users/${userId}/role`, { role });
}

export async function fetchAdminSystemHealth(): Promise<AdminSystemHealthEntry[]> {
  const response = await api.get('/admin/system/health');
  return (response.data ?? []) as AdminSystemHealthEntry[];
}

export async function fetchAdminLogs(type: 'requests' | 'errors' | 'ai'): Promise<AdminLogEntry[]> {
  const response = await api.get(`/admin/logs/${type}`);
  return (response.data ?? []) as AdminLogEntry[];
}

export async function fetchAdminBilling(userId: string): Promise<AdminBillingSnapshot> {
  const response = await api.get(`/admin/billing/user/${userId}`);
  return response.data as AdminBillingSnapshot;
}

export async function adjustAdminCredits(
  userId: string,
  amount: number,
  reason?: string,
): Promise<void> {
  await api.post(`/admin/billing/user/${userId}/credits-adjust`, { amount, reason });
}

export async function fetchAdminSessions(): Promise<AdminSessionSnapshot[]> {
  const response = await api.get('/admin/sessions/active');
  return (response.data ?? []) as AdminSessionSnapshot[];
}

export async function requestSessionTakeover(sessionId: string, reason?: string): Promise<void> {
  await api.post(`/admin/sessions/${sessionId}/takeover`, { reason });
}
