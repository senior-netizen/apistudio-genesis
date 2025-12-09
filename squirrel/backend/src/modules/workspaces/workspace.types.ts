export interface WorkspaceBundle {
  version: number;
  projects: Array<WorkspaceProject>;
  environments: Array<WorkspaceEnvironment>;
  history: any[];
  mocks: any[];
  collaboration?: any;
}

export interface WorkspaceProject {
  id?: string;
  name: string;
  description?: string | null;
  collections: WorkspaceCollection[];
  environments?: WorkspaceEnvironment[];
}

export interface WorkspaceCollection {
  id?: string;
  name: string;
  description?: string | null;
  requests: WorkspaceRequest[];
  folders?: WorkspaceCollection[];
}

export interface WorkspaceRequest {
  id?: string;
  name: string;
  method: string;
  url: string;
  description?: string | null;
  headers?: Array<{ key: string; value?: string; enabled?: boolean; description?: string }>;
  params?: Array<{ key: string; value?: string; enabled?: boolean; description?: string }>;
  body?: any;
}

export interface WorkspaceEnvironment {
  id?: string;
  name: string;
  projectId?: string | null;
  isDefault?: boolean;
  variables: Array<{ key: string; value: string; enabled?: boolean; description?: string }>;
}

export interface WorkspaceAuditLog {
  id: string;
  workspaceId: string;
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: Date;
}

export interface WorkspaceImportSummary {
  projects: number;
  collections: number;
  requests: number;
  environments: number;
}
