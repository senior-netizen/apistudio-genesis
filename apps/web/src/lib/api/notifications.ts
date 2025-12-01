import { apiFetch } from './client';

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  channel: 'ai' | 'payments' | 'collaboration' | 'alerts' | string;
  createdAt: string;
  read?: boolean;
}

export interface ActivityEntry {
  id: string;
  message: string;
  createdAt: string;
  actor?: string;
  type?: string;
}

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  const response = await apiFetch('/notifications', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load notifications');
  }
  return response.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await apiFetch('/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

export async function fetchTeamActivity(): Promise<ActivityEntry[]> {
  const response = await apiFetch('/activity/team', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load team activity');
  }
  return response.json();
}
