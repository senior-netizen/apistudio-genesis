export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

export interface ApiRequest {
  id?: string;
  name?: string;
  description?: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  environmentId?: string;
  authId?: string;
  tests?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
  size?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response?: ApiResponse;
  errorMessage?: string;
  status?: number;
  favorite?: boolean;
  latency?: number;
  tests?: TestResult[];
}

export interface TestResult {
  id: string;
  title: string;
  passed: boolean;
  message?: string;
}

export interface EnvironmentDefinition {
  id: string;
  name: string;
  variables: Record<string, string>;
  isDefault?: boolean;
  color?: string;
  authIds?: string[];
}

export type AuthType = "none" | "basic" | "bearer" | "apiKey" | "oauth2";

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

export interface BearerAuthCredentials {
  token: string;
}

export interface ApiKeyCredentials {
  key: string;
  placement: "header" | "query";
  target: string;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
  usePKCE?: boolean;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export type AuthCredentials =
  | { id: string; name: string; type: "none" }
  | { id: string; name: string; type: "basic"; data: BasicAuthCredentials }
  | { id: string; name: string; type: "bearer"; data: BearerAuthCredentials }
  | { id: string; name: string; type: "apiKey"; data: ApiKeyCredentials }
  | { id: string; name: string; type: "oauth2"; data: OAuthConfig; token?: OAuthToken };

export interface CollectionRequestNode {
  id: string;
  type: "request";
  name: string;
  request: ApiRequest;
  tests?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionFolderNode {
  id: string;
  type: "folder";
  name: string;
  children: CollectionNode[];
  createdAt: number;
  updatedAt: number;
}

export type CollectionNode = CollectionRequestNode | CollectionFolderNode;

export interface ApiProject {
  id: string;
  name: string;
  description?: string;
  collections: CollectionNode[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryAnalyticsSnapshot {
  total: number;
  successes: number;
  failures: number;
  averageLatency: number;
  favorites: number;
}

export interface DocumentationBundle {
  markdown: string;
  html: string;
  generatedAt: number;
}

export type AiCommand = "analyzeResponse" | "suggestFix" | "generateRequest" | "explainError";
