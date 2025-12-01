import { api } from './api';
import type { ProductAnnouncement } from '../types/announcements';
import type { CurrentUserProfile } from '../types/auth';

export async function fetchCurrentUser(): Promise<CurrentUserProfile | null> {
  try {
    const response = await api.get('/v1/auth/me');
    const payload = response.data ?? {};
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const id = typeof payload.id === 'string' ? payload.id : String(payload.id ?? '');
    const email = typeof payload.email === 'string' ? payload.email : String(payload.email ?? '');
    const role = typeof payload.role === 'string' ? payload.role : String(payload.role ?? 'user');
    if (!id || !email) {
      return null;
    }
    return {
      id,
      email,
      role: role.toLowerCase(),
      displayName: typeof payload.displayName === 'string' ? payload.displayName : undefined,
    };
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined;
    if (status === 401 || status === 403) {
      return null;
    }
    throw error;
  }
}

export async function fetchWorkspaces(page = 1, pageSize = 20) {
  const response = await api.get('/v1/workspaces', { params: { page, pageSize } });
  return response.data;
}

export async function fetchProjects(workspaceId: string, page = 1, pageSize = 20) {
  const response = await api.get('/v1/projects', { params: { workspaceId, page, pageSize } });
  return response.data;
}

export async function fetchCollections(projectId: string) {
  const response = await api.get(`/v1/projects/${projectId}/collections`);
  return response.data;
}

export async function fetchRequests(projectId: string, page = 1, pageSize = 20) {
  const response = await api.get(`/v1/projects/${projectId}/requests`, { params: { page, pageSize } });
  return response.data;
}

export async function fetchEnvironments(projectId: string) {
  const response = await api.get(`/v1/projects/${projectId}/environments`);
  return response.data;
}

const announcementFallback: ProductAnnouncement[] = [
  {
    id: 'workspace-insights',
    title: 'Workspace insights just launched',
    description:
      'Track request quality, latency trends, and collaboration health in one consolidated dashboard – now available to all workspaces.',
    href: '/analytics/insights',
    ctaLabel: 'Open insights',
    publishedAt: new Date().toISOString(),
    audience: 'all' as const,
    tag: 'New'
  }
];

export async function fetchAnnouncements(): Promise<ProductAnnouncement[]> {
  try {
    const response = await api.get('/v1/announcements', { params: { page: 1, pageSize: 3 } });
    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    if (items.length === 0) {
      return announcementFallback;
    }
    const normalized: ProductAnnouncement[] = items.map((item: any, index: number) => ({
      id: String(item.id ?? item.slug ?? `announcement-${index}`),
      title: item.title ?? 'Product update',
      description:
        item.description ??
        'Discover the latest improvements to the Squirrel workspace, including more capable automation and observability.',
      href: item.href ?? item.link ?? '#',
      ctaLabel: item.ctaLabel ?? item.cta ?? 'Learn more',
      publishedAt: item.publishedAt ?? item.updatedAt ?? new Date().toISOString(),
      audience: item.audience ?? 'all',
      tag: item.tag ?? item.category,
    }));
    return normalized;
  } catch (error) {
    console.warn('Unable to load announcements from API. Falling back to defaults.', error);
    return announcementFallback;
  }
}

export async function runRequest(requestId: string) {
  const response = await api.post(`/v1/requests/${requestId}/run`);
  return response.data;
}

export async function fetchHistory(requestId: string, page = 1, pageSize = 20) {
  const response = await api.get(`/v1/requests/${requestId}/history`, { params: { page, pageSize } });
  return response.data;
}
