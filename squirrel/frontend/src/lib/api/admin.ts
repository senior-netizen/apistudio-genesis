import { api } from '../../services/api';

export interface ControlCenterOverview {
  uptimeSeconds: number;
  version: string;
  errorRate: number;
}

export interface ControlCenterUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  accountFrozen: boolean;
  lastSeenAt: string;
}

export interface ControlActivityEntry {
  id: string;
  type: 'audit' | 'request';
  createdAt: string;
  actorId?: string | null;
  workspaceId?: string | null;
  detail: unknown;
}

export interface ControlHealthEntry {
  component: string;
  status: 'up' | 'down';
  detail?: string;
}

export async function fetchControlOverview(): Promise<ControlCenterOverview> {
  const response = await api.get('/v1/admin/control/overview');
  return response.data as ControlCenterOverview;
}

export async function fetchControlUsers(): Promise<ControlCenterUser[]> {
  const response = await api.get('/v1/admin/control/users');
  return response.data as ControlCenterUser[];
}

export async function fetchControlActivity(): Promise<ControlActivityEntry[]> {
  const response = await api.get('/v1/admin/control/activity');
  return response.data as ControlActivityEntry[];
}

export async function fetchControlHealth(): Promise<ControlHealthEntry[]> {
  const response = await api.get('/v1/admin/control/system-health');
  return response.data as ControlHealthEntry[];
}

export async function promoteUser(userId: string): Promise<void> {
  await api.patch(`/v1/admin/control/users/${userId}/promote`);
}

export async function demoteUser(userId: string): Promise<void> {
  await api.patch(`/v1/admin/control/users/${userId}/demote`);
}

export async function setUserFrozen(userId: string, frozen: boolean): Promise<void> {
  await api.patch(`/v1/admin/control/users/${userId}/freeze`, { frozen });
}
