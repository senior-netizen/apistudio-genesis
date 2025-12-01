import type { UlidLike } from 'ulidx';
import type { CollaborationState } from './collaboration';

export type Ulid = UlidLike | string;

export interface Variable {
  id: Ulid;
  key: string;
  value: string;
  scope: 'global' | 'environment' | 'local';
  secret?: boolean;
  description?: string;
  enabled: boolean;
}

export interface ApiEnvironment {
  id: Ulid;
  name: string;
  variables: Variable[];
  color?: string;
  isDefault?: boolean;
}

export interface ApiExample {
  id: Ulid;
  name: string;
  description?: string;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  status?: number;
  createdAt: string;
}

export interface ApiRequest {
  id: Ulid;
  name: string;
  method: string;
  url: string;
  description?: string;
  body?: RequestBody;
  headers: RequestHeader[];
  params: RequestParam[];
  auth: RequestAuth;
  scripts: RequestScripts;
  tags: string[];
  examples: ApiExample[];
  lastRunAt?: string;
  owner?: string;
}

export interface RequestHeader {
  id: Ulid;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  preset?: boolean;
}

export interface RequestParam {
  id: Ulid;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export type BodyMode =
  | 'none'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'json'
  | 'xml'
  | 'raw'
  | 'binary';

export interface RequestBody {
  mode: BodyMode;
  json?: string;
  xml?: string;
  raw?: string;
  formData?: Array<{ id: Ulid; key: string; value: string; enabled: boolean; isFile?: boolean }>;
  urlEncoded?: Array<{ id: Ulid; key: string; value: string; enabled: boolean }>;
  fileName?: string;
  mimeType?: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';

export interface RequestAuth {
  type: AuthType;
  bearerToken?: string;
  basic?: { username: string; password: string };
  apiKey?: { key: string; value: string; in: 'header' | 'query' };
  oauth2?: OAuth2Config;
}

export interface OAuth2Config {
  grantType: 'authorizationCode' | 'clientCredentials';
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri?: string;
  codeVerifier?: string;
  token?: string;
  expiresAt?: string;
}

export interface RequestScripts {
  preRequest: string;
  test: string;
}

export interface ApiFolder {
  id: Ulid;
  name: string;
  description?: string;
  requests: ApiRequest[];
  folders: ApiFolder[];
}

export interface ApiCollection {
  id: Ulid;
  name: string;
  description?: string;
  folders: ApiFolder[];
  requests: ApiRequest[];
  tags: string[];
  owner?: string;
  favorite?: boolean;
}

export interface ApiProject {
  id: Ulid;
  name: string;
  description?: string;
  collections: ApiCollection[];
  favorite?: boolean;
  tags?: string[];
}

export interface HistoryEntry {
  id: Ulid;
  requestId: Ulid;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  timestamp: string;
  pinned?: boolean;
}

export interface MockRoute {
  id: Ulid;
  requestId: Ulid;
  url: string;
  method: string;
  exampleId?: Ulid;
  enabled: boolean;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
}

export interface WorkspaceBundle {
  version: number;
  projects: ApiProject[];
  environments: ApiEnvironment[];
  history: HistoryEntry[];
  mocks: MockRoute[];
  collaboration?: CollaborationState;
}

export interface RequestTimelineEntry {
  phase: 'dns' | 'tcp' | 'tls' | 'ttfb' | 'download';
  duration: number;
}

export interface ResponseSnapshot {
  id: Ulid;
  status: number;
  statusText: string;
  method: string;
  url: string;
  duration: number;
  size: number;
  headers: Record<string, string>;
  body: string;
  cookies: Array<{ key: string; value: string; attributes: Record<string, string> }>;
  timeline: RequestTimelineEntry[];
  completedAt: string;
}
