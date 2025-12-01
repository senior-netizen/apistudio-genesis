export type RunnerVariable = {
  key: string;
  value: string;
  enabled?: boolean;
  secret?: boolean;
  description?: string;
};

export interface RunnerVariableScope {
  id?: string;
  name?: string;
  variables: RunnerVariable[];
  color?: string;
}

export interface RunnerVariableContext {
  globals?: RunnerVariable[];
  environment?: RunnerVariableScope;
  locals?: RunnerVariable[];
}

export type RunnerBodyMode =
  | 'none'
  | 'json'
  | 'xml'
  | 'raw'
  | 'form-data'
  | 'multipart'
  | 'x-www-form-urlencoded'
  | 'binary';

export interface RunnerBodyField {
  key: string;
  value: string;
  enabled?: boolean;
  fileName?: string;
  contentType?: string;
}

export interface RunnerRequestBody {
  mode: RunnerBodyMode;
  json?: string;
  xml?: string;
  raw?: string;
  formData?: RunnerBodyField[];
  multipart?: RunnerBodyField[];
  urlEncoded?: RunnerBodyField[];
  fileName?: string;
  mimeType?: string;
}

export interface RunnerRequestHeader {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface RunnerRequestParam {
  key: string;
  value: string;
  enabled?: boolean;
}

export type RunnerAuthType = 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';

export interface RunnerAuthConfig {
  type: RunnerAuthType;
  bearerToken?: string;
  basic?: { username: string; password: string };
  apiKey?: { key: string; value: string; in: 'header' | 'query' };
  oauth2?: { accessToken?: string; tokenType?: string };
}

export interface RunnerRequest {
  id?: string;
  name?: string;
  method: string;
  url: string;
  headers?: RunnerRequestHeader[];
  params?: RunnerRequestParam[];
  body?: RunnerRequestBody;
  auth?: RunnerAuthConfig;
  description?: string;
}

export interface RunnerResolvedRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: BodyInit | ArrayBuffer | null;
  rawBody?: RunnerRequestBody;
}

export interface RunnerTimelineEntry {
  phase: 'dns' | 'tcp' | 'tls' | 'ttfb' | 'download';
  duration: number;
}

export interface RunnerResponseSnapshot {
  id: string;
  status: number;
  statusText: string;
  method: string;
  url: string;
  duration: number;
  size: number;
  headers: Record<string, string>;
  body: string;
  cookies: Array<{ key: string; value: string; attributes: Record<string, string> }>;
  timeline: RunnerTimelineEntry[];
  completedAt: string;
}

export interface RunnerHistoryEntry {
  id: string;
  requestId: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  executedAt: string;
}

export interface RunnerProgressEvent {
  requestId: string;
  receivedBytes: number;
  chunk?: string;
  totalBytes?: number;
}

export interface RunnerErrorEvent {
  requestId: string;
  error: Error;
}

export interface RunnerStartEvent {
  requestId: string;
  request: RunnerResolvedRequest;
}

export interface RunnerSuccessEvent {
  requestId: string;
  request: RunnerResolvedRequest;
  response: RunnerResponseSnapshot;
  history: RunnerHistoryEntry;
}

export type RequestRunnerEvents = {
  'request:start': RunnerStartEvent;
  'request:progress': RunnerProgressEvent;
  'request:success': RunnerSuccessEvent;
  'request:error': RunnerErrorEvent;
};

export interface RunnerHistoryStorage {
  load: () => Promise<RunnerHistoryEntry[] | undefined> | RunnerHistoryEntry[] | undefined;
  save: (history: RunnerHistoryEntry[]) => Promise<void> | void;
}

export interface RequestRunnerOptions {
  platform?: 'web' | 'desktop' | 'vscode' | 'node';
  historyLimit?: number;
  historyStorage?: RunnerHistoryStorage;
  fetchImplementation?: typeof fetch;
}

export interface RunnerExecutionOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  variableContext?: RunnerVariableContext;
}
