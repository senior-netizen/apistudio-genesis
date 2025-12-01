export type ApiWorkspace = {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  role?: string;
};

export type ApiProject = {
  id: string;
  name: string;
  description?: string;
};

export type ApiEnvironment = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type ApiRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  description?: string;
};

export type ApiRequestRun = {
  id: string;
  status: string;
  createdAt: string;
  durationMs?: number | null;
};

export type AnalyticsSummary = {
  totalRuns: number;
  averageDurationMs: number;
};

export type WorkspaceSnapshot = {
  workspace: ApiWorkspace;
  projects: ApiProject[];
  environments: ApiEnvironment[];
  requests: ApiRequest[];
  history: ApiRequestRun[];
  analytics?: AnalyticsSummary;
};

export type ListResponse<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  displayName?: string;
};
