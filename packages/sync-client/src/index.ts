import EventEmitter from 'eventemitter3';
import type {
  ChangeEnvelope,
  ScopeType,
  SyncAck,
  SyncHandshakeResponse,
  SyncMetricsSample,
  SyncPresenceEvent,
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  SyncStateRecord,
  SyncVectorClock,
} from '@sdl/sync-core';
import * as syncCore from '@sdl/sync-core';
import type {
  DurableChange,
  DurableStorageAdapter,
  SyncClientEvents,
  SyncClientLogger,
  SyncClientOptions,
  SyncScope,
  SyncStatus,
} from './types';

function defaultOptions(): SyncClientOptions {
  return {
    baseUrl: '/v1',
    workspaceId: 'local-workspace',
    protocolVersion: '1.0.0',
    appKind: 'web',
    clientId: Math.random().toString(36).slice(2),
    // storage is injected by caller; this is a placeholder to satisfy typing.
    storage: {
      enqueue: async () => {},
      listQueued: async () => [],
      removeQueued: async () => {},
      getVectorClock: async () => null,
      setVectorClock: async () => {},
      getState: async () => null,
    },
  };
}

function resolveFetch(options?: SyncClientOptions): typeof fetch {
  const opts = options ?? defaultOptions();
  if (opts.fetchImplementation) {
    return opts.fetchImplementation;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  throw new Error('No fetch implementation available for SyncClient');
}

function resolveWebSocket(options?: SyncClientOptions): typeof WebSocket | undefined {
  const opts = options ?? defaultOptions();
  if (opts.WebSocketImplementation) {
    return opts.WebSocketImplementation;
  }
  return typeof WebSocket === 'function' ? WebSocket : undefined;
}

const { createVectorClock, mergeVectorClocks } = syncCore;

export class SyncClient extends EventEmitter<SyncClientEvents> {
  private readonly options: SyncClientOptions;
  private status: SyncStatus;
  private readonly fetchImpl: typeof fetch;
  private readonly WebSocketImpl: typeof WebSocket | undefined;
  private deviceId: string | null;
  private sessionToken: string | null;
  private serverEpoch: number;
  private ws: WebSocket | null;
  private readonly subscriptions: Map<string, SyncScope>;
  private readonly pullTimers: Map<string, ReturnType<typeof setTimeout>>;
  private pushTimer: ReturnType<typeof setTimeout> | null;
  private readonly metrics: SyncMetricsSample;
  private reconnectAttempts: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null;

  constructor(options?: SyncClientOptions) {
    super();
    this.options = options ?? defaultOptions();
    this.fetchImpl = resolveFetch(this.options);
    this.WebSocketImpl = resolveWebSocket(this.options);
    this.status = 'idle';
    this.deviceId = null;
    this.sessionToken = null;
    this.serverEpoch = 0;
    this.ws = null;
    this.subscriptions = new Map<string, SyncScope>();
    this.pullTimers = new Map<string, ReturnType<typeof setTimeout>>();
    this.pushTimer = null;
    this.metrics = {
      timestamp: Date.now(),
      bytesSent: 0,
      bytesReceived: 0,
      operations: 0,
    };
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  async connect(): Promise<void> {
    if (this.status === 'connecting' || this.status === 'online') {
      return;
    }
    this.updateStatus('connecting');
    try {
      const handshake = await this.performHandshake();
      this.deviceId = handshake.deviceId;
      this.sessionToken = handshake.sessionToken;
      this.serverEpoch = handshake.lastEpoch;
      await this.establishWebSocket();
      this.updateStatus('online');
      await this.replayQueuedChanges();
      this.schedulePullForAll();
    } catch (error) {
      this.logger().error('Sync handshake failed', error);
      this.updateStatus('error');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.clearAllPullTimers();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('idle');
  }

  subscribe(scope: SyncScope): void {
    const key = this.scopeKey(scope);
    this.subscriptions.set(key, scope);
    if (this.status === 'online') {
      void this.pull(scope);
    }
  }

  unsubscribe(scope: SyncScope): void {
    const key = this.scopeKey(scope);
    this.subscriptions.delete(key);
    const timer = this.pullTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pullTimers.delete(key);
    }
  }

  async queueChange(change: DurableChange): Promise<void> {
    await this.options.storage.enqueue(change);
    this.schedulePush();
  }

  async sendPresence(event: SyncPresenceEvent): Promise<void> {
    if (!this.ws || this.ws.readyState !== this.WebSocketImpl?.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify({ type: 'presence', payload: event }));
  }

  private logger(): SyncClientLogger {
    return (
      this.options.logger ?? {
        debug: (...args: unknown[]) => console.debug('[sync-client]', ...args),
        warn: (...args: unknown[]) => console.warn('[sync-client]', ...args),
        error: (...args: unknown[]) => console.error('[sync-client]', ...args),
      }
    );
  }

  private scopeKey(scope: SyncScope): string {
    return `${scope.scopeType}:${scope.scopeId}`;
  }

  private updateStatus(status: SyncStatus) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.emit('status', status);
  }

  private async performHandshake(): Promise<SyncHandshakeResponse> {
    const body = {
      clientId: this.options.clientId,
      protocolVersion: this.options.protocolVersion,
      appKind: this.options.appKind,
      deviceId: this.deviceId,
      workspaceId: this.options.workspaceId,
    };

    const response = await this.fetchImpl(`${this.options.baseUrl}/sync/handshake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Handshake failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SyncHandshakeResponse;
    return payload;
  }

  private async establishWebSocket(): Promise<void> {
    if (!this.WebSocketImpl) {
      this.logger().warn('WebSocket implementation missing; falling back to HTTP-only sync');
      return;
    }

    const wsUrl = new URL(this.options.baseUrl.replace(/^http/, 'ws'));
    wsUrl.pathname = `/sync/ws/${this.options.workspaceId}`;
    wsUrl.searchParams.set('token', this.sessionToken ?? '');

    this.ws = new this.WebSocketImpl(wsUrl.toString());
    this.ws.addEventListener('open', () => {
      this.logger().debug('Sync websocket opened');
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.ws?.send(
        JSON.stringify({
          type: 'hello',
          payload: {
            deviceId: this.deviceId,
            clientVersion: this.options.protocolVersion,
            protocolVersion: this.options.protocolVersion,
            vectorClock: createVectorClock(),
          },
        }),
      );
    });
    this.ws.addEventListener('message', (event) => {
      try {
        this.onWebSocketMessage(event.data);
      } catch (error) {
        this.logger().error('Sync websocket handler error', error);
      }
    });
    this.ws.addEventListener('close', () => {
      this.logger().warn('Sync websocket closed');
      this.updateStatus('offline');
      const backoff = Math.min(15000, 1000 * 2 ** this.reconnectAttempts);
      this.reconnectAttempts += 1;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        void this.connect().catch((error) => this.logger().error('Reconnect failed', error));
      }, backoff);
    });
    this.ws.addEventListener('error', (error) => {
      this.logger().error('Websocket error', error);
      this.updateStatus('error');
    });
  }

  private onWebSocketMessage(raw: unknown) {
    if (typeof raw !== 'string') {
      return;
    }
    try {
      const parsed = JSON.parse(raw as string) as {
        type: string;
        payload?: unknown;
      };
      switch (parsed.type) {
        case 'changes.push': {
          const payload = parsed.payload as { scopeType: ScopeType; scopeId: string; changes: ChangeEnvelope[] };
          const scope = { scopeType: payload.scopeType, scopeId: payload.scopeId };
          this.emit('changes', { scope, changes: payload.changes });
          this.metrics.bytesReceived += raw.length;
          this.metrics.operations += payload.changes.length;
          break;
        }
        case 'changes.ack': {
          const payload = parsed.payload as SyncAck;
          this.emit('ack', payload);
          break;
        }
        case 'snapshot': {
          const payload = parsed.payload as SyncPullResponse & { scopeType: ScopeType; scopeId: string };
          const scope = { scopeType: payload.scopeType, scopeId: payload.scopeId };
          this.emit('snapshot', { scope, response: payload });
          break;
        }
        case 'presence': {
          const payload = parsed.payload as SyncPresenceEvent;
          this.emit('presence', payload);
          break;
        }
        case 'error': {
          throw new Error((parsed.payload as { message: string })?.message ?? 'Unknown sync error');
        }
        default:
          this.logger().debug('Unhandled websocket event', parsed.type);
      }
    } catch (error) {
      this.logger().error('Failed to parse websocket message', error);
    }
  }

  private schedulePush() {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.flushQueue();
    }, this.options.pushDebounceMs ?? 250);
  }

  private schedulePullForAll() {
    for (const scope of this.subscriptions.values()) {
      this.schedulePull(scope);
    }
  }

  private schedulePull(scope: SyncScope) {
    const key = this.scopeKey(scope);
    const interval = this.options.pullIntervalMs ?? 5000;
    const timer = setTimeout(() => {
      void this.pull(scope);
    }, interval);
    this.pullTimers.set(key, timer);
  }

  private clearAllPullTimers() {
    for (const timer of this.pullTimers.values()) {
      clearTimeout(timer);
    }
    this.pullTimers.clear();
  }

  private async pull(scope: SyncScope): Promise<void> {
    const key = this.scopeKey(scope);
    const existingTimer = this.pullTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.pullTimers.delete(key);
    }

    const vectorClock =
      scope.vectorClock ?? (await this.options.storage.getVectorClock(scope)) ?? createVectorClock();
    const request: SyncPullRequest = {
      workspaceId: this.options.workspaceId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      sinceEpoch: scope.sinceEpoch ?? this.serverEpoch,
      vectorClock,
      sessionToken: this.sessionToken ?? undefined,
    };

    try {
      const response = await this.fetchImpl(`${this.options.baseUrl}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.sessionToken ? `Bearer ${this.sessionToken}` : '',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`Pull failed with status ${response.status}`);
      }
      const payload = (await response.json()) as SyncPullResponse;
      this.metrics.bytesReceived += JSON.stringify(payload).length;
      this.metrics.operations += payload.changes.length;
      this.emit('changes', { scope, changes: payload.changes });
      if (payload.snapshot) {
        this.emit('snapshot', { scope, response: payload });
      }
      const newClock = mergeVectorClocks(vectorClock, scope.vectorClock ?? {});
      await this.options.storage.setVectorClock(scope, newClock, this.serverEpoch);
    } catch (error) {
      this.logger().error('Pull failed', error);
      this.updateStatus('offline');
    } finally {
      this.schedulePull(scope);
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.status !== 'online') {
      return;
    }
    const queued = await this.options.storage.listQueued();
    if (queued.length === 0) {
      return;
    }

    const request: SyncPushRequest = {
      workspaceId: this.options.workspaceId,
      sessionToken: this.sessionToken ?? undefined,
      changes: queued.map((entry) => entry.change),
    };

    try {
      const response = await this.fetchImpl(`${this.options.baseUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.sessionToken ? `Bearer ${this.sessionToken}` : '',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Push failed with status ${response.status}`);
      }

      const payload = (await response.json()) as SyncPushResponse;
      this.metrics.bytesSent += JSON.stringify(request).length;
      this.metrics.operations += request.changes.length;
      this.emit('ack', payload.ack);
      await this.options.storage.removeQueued(queued.map((entry) => entry.id));
      if (payload.conflicts.length > 0) {
        this.emit('changes', {
          scope: { scopeType: payload.conflicts[0].scopeType, scopeId: payload.conflicts[0].scopeId },
          changes: payload.conflicts,
        });
      }
    } catch (error) {
      this.logger().error('Push failed', error);
      this.updateStatus('offline');
      this.schedulePush();
    }
  }

  private async replayQueuedChanges(): Promise<void> {
    const queued = await this.options.storage.listQueued();
    if (queued.length === 0) {
      return;
    }
    this.logger().debug('Replaying queued sync operations', queued.length);
    this.schedulePush();
  }
}

export class InMemoryDurableStorage implements DurableStorageAdapter {
  private readonly vectorClocks = new Map<string, SyncVectorClock>();
  private readonly queued: DurableChange[] = [];
  private readonly states = new Map<string, SyncStateRecord>();

  constructor(private readonly clockFactory = createVectorClock) {}

  async getVectorClock(scope: SyncScope): Promise<SyncVectorClock | null> {
    return this.vectorClocks.get(this.scopeKey(scope)) ?? null;
  }

  async setVectorClock(scope: SyncScope, clock: SyncVectorClock, serverEpoch: number): Promise<void> {
    this.vectorClocks.set(this.scopeKey(scope), { ...clock });
    const state: SyncStateRecord = {
      id: this.scopeKey(scope),
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      deviceId: 'local',
      vectorClock: { ...clock },
      serverEpoch,
      updatedAt: new Date().toISOString(),
    };
    this.states.set(this.scopeKey(scope), state);
  }

  async enqueue(change: DurableChange): Promise<void> {
    const index = this.queued.findIndex((entry) => entry.id === change.id);
    if (index >= 0) {
      this.queued[index] = change;
    } else {
      this.queued.push(change);
    }
  }

  async listQueued(): Promise<DurableChange[]> {
    return [...this.queued].sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  async removeQueued(ids: string[]): Promise<void> {
    for (const id of ids) {
      const index = this.queued.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        this.queued.splice(index, 1);
      }
    }
  }

  async getState(scope: SyncScope): Promise<SyncStateRecord | null> {
    return this.states.get(this.scopeKey(scope)) ?? null;
  }

  private scopeKey(scope: SyncScope): string {
    return `${scope.scopeType}:${scope.scopeId}`;
  }
}

export * from './adapters/indexedDb';

export * from "./types";
