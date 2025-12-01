import * as vscode from 'vscode';
import {
  AnalyticsSummary,
  ApiEnvironment,
  ApiProject,
  ApiRequest,
  ApiRequestRun,
  ApiWorkspace,
  CurrentUser,
  ListResponse,
  WorkspaceSnapshot,
} from '../types';
import { CredentialsManager } from './credentialsManager';
import { CsrfManager } from '@sdl/sdk';
import { brand } from '@sdl/language';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(private readonly credentials: CredentialsManager) {}

  private readonly unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  private getBaseUrl(): string {
    const config = vscode.workspace.getConfiguration('apistudio');
    const raw = config.get<string>('apiBaseUrl') ?? 'http://localhost:8081';
    try {
      const trimmed = raw.trim();
      if (!trimmed) {
        return 'http://localhost:8081';
      }
      const normalized = new URL(trimmed, trimmed.startsWith('http') ? undefined : 'https://');
      return normalized.toString().replace(/\/$/, '');
    } catch (error) {
      console.warn('Invalid API base URL configured. Falling back to default.', error);
      return 'http://localhost:8081';
    }
  }

  public getResolvedBaseUrl(): string {
    return this.getBaseUrl();
  }

  private async request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const token = await this.credentials.ensureAccessToken(baseUrl);
    const url = new URL(path, baseUrl).toString();
    const method = (init.method ?? 'GET').toUpperCase();
    const requiresCsrf = this.unsafeMethods.has(method);

    const execute = async () => {
      const headers = new Headers(init.headers ?? {});
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      headers.set('User-Agent', brand.userAgent('vscode'));
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!CsrfManager.getToken() || requiresCsrf) {
        await this.ensureCsrf(baseUrl);
      }
      for (const [key, value] of Object.entries(CsrfManager.header())) {
        headers.set(key, value);
      }

      return fetch(url, { ...init, headers, credentials: 'include' });
    };

    let response = await execute();
    if (requiresCsrf && response.status === 403) {
      await this.ensureCsrf(baseUrl, true);
      response = await execute();
    }
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const code = typeof payload === 'object' && payload && 'code' in payload ? String(payload.code) : undefined;
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message?: string }).message)
          : response.statusText || 'Request failed';
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(message || 'Authentication required', response.status, code ?? 'AUTHENTICATION_REQUIRED');
      }
      throw new ApiError(message, response.status, code);
    }

    return payload as T;
  }

  private async ensureCsrf(baseUrl: string, force = false) {
    if (force) {
      CsrfManager.setToken(null);
    }
    if (CsrfManager.getToken()) {
      return;
    }
    await CsrfManager.load(`${baseUrl}/auth/csrf`);
  }

  public async listWorkspaces(): Promise<ApiWorkspace[]> {
    const data = await this.request<ListResponse<any> | any[]>('/v1/workspaces');
    const items: any[] = Array.isArray((data as ListResponse<any>).items)
      ? (data as ListResponse<any>).items
      : Array.isArray(data)
      ? (data as any[])
      : [];

    return items
      .map((item) => ({
        id: String(item.id ?? item.workspaceId ?? ''),
        name: String(item.name ?? item.workspace?.name ?? ''),
        slug: item.slug ?? item.workspace?.slug ?? undefined,
        plan: item.plan ?? item.workspace?.plan ?? undefined,
        role: item.role ?? item.membershipRole ?? item.workspace?.role ?? undefined,
      }))
      .filter((workspace) => workspace.id && workspace.name);
  }

  public async getProjects(workspaceId: string, pageSize = 20): Promise<ListResponse<ApiProject>> {
    if (!workspaceId) {
      return { items: [] };
    }
    const data = await this.request<ListResponse<any>>(
      `/v1/projects?workspaceId=${encodeURIComponent(workspaceId)}&page=1&pageSize=${pageSize}`,
    );
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      items: items.map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? 'Untitled project'),
        description: item.description ?? undefined,
      })),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  }

  public async getRequests(projectId: string, pageSize = 20): Promise<ListResponse<ApiRequest>> {
    if (!projectId) {
      return { items: [] };
    }
    const data = await this.request<ListResponse<any>>(
      `/v1/projects/${encodeURIComponent(projectId)}/requests?page=1&pageSize=${pageSize}`,
    );
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      items: items.map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? 'Untitled request'),
        method: String(item.method ?? 'GET'),
        url: String(item.url ?? ''),
        description: item.description ?? undefined,
      })),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  }

  public async getEnvironments(projectId: string): Promise<ApiEnvironment[]> {
    if (!projectId) {
      return [];
    }
    const data = await this.request<any[]>(`/v1/projects/${encodeURIComponent(projectId)}/environments`);
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? 'Environment'),
      isDefault: item.scope ? String(item.scope).toUpperCase() === 'WORKSPACE' : undefined,
    }));
  }

  public async getAnalyticsSummary(workspaceId: string): Promise<AnalyticsSummary | undefined> {
    if (!workspaceId) {
      return undefined;
    }
    const data = await this.request<{ totalRuns?: number; averageDurationMs?: number }>(
      `/v1/analytics/summary?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
    return {
      totalRuns: data.totalRuns ?? 0,
      averageDurationMs: data.averageDurationMs ?? 0,
    };
  }

  public async getRequestHistory(requestId: string, pageSize = 5): Promise<ApiRequestRun[]> {
    if (!requestId) {
      return [];
    }
    const data = await this.request<ListResponse<any>>(`/v1/requests/${encodeURIComponent(requestId)}/history?page=1&pageSize=${pageSize}`);
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map((item) => ({
      id: String(item.id ?? ''),
      status: String(item.status ?? 'UNKNOWN'),
      createdAt: String(item.createdAt ?? new Date().toISOString()),
      durationMs: item.durationMs ?? null,
    }));
  }

  public async runRequest(requestId: string): Promise<{ runId?: string }> {
    if (!requestId) {
      throw new Error('Request identifier is required');
    }
    const data = await this.request<{ runId?: string }>(`/v1/requests/${encodeURIComponent(requestId)}/run`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return data ?? {};
  }

  public async getWorkspaceSnapshot(preferredId?: string): Promise<WorkspaceSnapshot> {
    const workspaces = await this.listWorkspaces();
    if (!workspaces.length) {
      throw new ApiError('No workspaces are available for this account.', 404, 'NO_WORKSPACES');
    }

    const normalizedPreferred = preferredId?.trim().toLowerCase();
    const workspace =
      workspaces.find((item) => item.id === preferredId) ||
      workspaces.find((item) => item.slug?.toLowerCase() === normalizedPreferred) ||
      workspaces[0];

    const projectsResponse = await this.getProjects(workspace.id, 10);
    const projects = projectsResponse.items;
    const primaryProject = projects[0];

    let environments: ApiEnvironment[] = [];
    let requests: ApiRequest[] = [];
    let history: ApiRequestRun[] = [];

    if (primaryProject) {
      const [envResponse, requestResponse] = await Promise.all([
        this.getEnvironments(primaryProject.id),
        this.getRequests(primaryProject.id, 6),
      ]);
      environments = envResponse;
      requests = requestResponse.items;

      if (requests[0]) {
        history = await this.getRequestHistory(requests[0].id, 6);
      }
    }

    const analytics = await this.getAnalyticsSummary(workspace.id).catch(() => undefined);

    return {
      workspace,
      projects,
      environments,
      requests,
      history,
      analytics,
    };
  }

  public async getCurrentUser(): Promise<CurrentUser | null> {
    try {
      const data = await this.request<any>('/v1/auth/me');
      const id = typeof data?.id === 'string' ? data.id : String(data?.id ?? '');
      const email = typeof data?.email === 'string' ? data.email : String(data?.email ?? '');
      const role = typeof data?.role === 'string' ? data.role : String(data?.role ?? 'user');
      if (!id || !email) {
        return null;
      }
      return {
        id,
        email,
        role: role.toLowerCase(),
        displayName: typeof data?.displayName === 'string' ? data.displayName : undefined,
      };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return null;
      }
      throw error;
    }
  }
}
