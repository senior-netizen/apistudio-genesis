export interface EnvConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  variables?: Record<string, string>;
}

export interface CollectionRequest {
  id: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  body?: unknown;
  headers?: Record<string, string>;
  expect?: string[];
}

export interface CollectionDefinition {
  name: string;
  summary?: string;
  requests: CollectionRequest[];
}

export interface RecentRequestSnapshot {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  savedAt: string;
}

export interface UserProfile {
  email: string;
  workspace?: string;
  tokenId?: string;
  lastLogin?: string;
}

export interface SquirrelConfig {
  version: number;
  currentEnvironment?: string;
  environments: Record<string, EnvConfig>;
  collections: Record<string, CollectionDefinition>;
  recentRequests: RecentRequestSnapshot[];
  user?: UserProfile;
}
