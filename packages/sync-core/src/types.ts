export type WorkspaceKind = 'web' | 'desktop' | 'vscode';

export type ScopeType =
  | 'workspace'
  | 'project'
  | 'collection'
  | 'request'
  | 'environment'
  | 'variable'
  | 'secret';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace extends BaseRecord {
  name: string;
  slug: string;
  ownerId: string;
}

export interface Project extends BaseRecord {
  workspaceId: string;
  name: string;
  description?: string | null;
  order?: number | null;
}

export interface Collection extends BaseRecord {
  workspaceId: string;
  projectId?: string | null;
  name: string;
  order?: number | null;
}

export interface Request extends BaseRecord {
  collectionId: string;
  name: string;
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  tests?: unknown;
}

export interface Environment extends BaseRecord {
  projectId: string;
  name: string;
  variables: Record<string, unknown>;
}

export interface Secret extends BaseRecord {
  scopeType: 'workspace' | 'project';
  scopeId: string;
  key: string;
  valueEncrypted: string;
}

export interface Member extends BaseRecord {
  workspaceId: string;
  userId: string;
  role: string;
}

export interface Device extends BaseRecord {
  userId: string;
  kind: WorkspaceKind;
  fingerprint: string;
}

export interface SyncVectorClock {
  [deviceId: string]: number;
}

export type SyncLamport = number;

export interface ChangeEnvelope<TPayload = unknown> {
  id: string;
  scopeType: ScopeType;
  scopeId: string;
  deviceId: string;
  opType: 'insert' | 'update' | 'delete' | 'crdt';
  payload: TPayload;
  lamport: SyncLamport;
  serverEpoch: number;
  createdAt: string;
}

export interface SnapshotEnvelope {
  id: string;
  scopeType: ScopeType;
  scopeId: string;
  version: number;
  payloadCompressed: Uint8Array;
  createdAt: string;
}

export interface SyncAck {
  minEpoch: number;
  maxEpoch: number;
}

export interface SyncCapability {
  protocolVersion: string;
  appKind: WorkspaceKind;
  deviceId?: string;
  clientId: string;
  vectorClock?: SyncVectorClock;
}

export interface SyncHandshakeResponse {
  serverTime: string;
  protocolVersion: string;
  deviceId: string;
  sessionToken: string;
  lastEpoch: number;
}

export interface SyncPullRequest {
  scopeType: ScopeType;
  scopeId: string;
  sinceEpoch?: number;
  vectorClock?: SyncVectorClock;
}

export interface SyncPullResponse {
  changes: ChangeEnvelope[];
  snapshot?: SnapshotEnvelope | null;
}

export interface SyncPushRequest {
  changes: Array<Omit<ChangeEnvelope, 'serverEpoch' | 'createdAt'>>;
}

export interface SyncPushResponse {
  ack: SyncAck;
  conflicts: ChangeEnvelope[];
}

export type SyncPresenceEvent =
  | { type: 'cursor'; deviceId: string; requestId?: string; position?: number }
  | { type: 'typing'; deviceId: string; requestId?: string; active: boolean }
  | { type: 'selection'; deviceId: string; nodeId?: string };

export interface SyncMetricsSample {
  timestamp: number;
  bytesSent: number;
  bytesReceived: number;
  operations: number;
  latencyMs?: number;
  backlog?: number;
  conflicts?: number;
}
