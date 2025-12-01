import { io, type Socket } from 'socket.io-client';

export interface CollabCursor {
  field: string;
  position: number;
  valueLength: number;
  selection?: { start: number; end: number } | null;
}

export interface CollaboratorState {
  socketId: string;
  userId: string;
  displayName: string;
  email?: string;
  color: string;
  joinedAt: string;
  updatedAt: string;
  cursor?: CollabCursor | null;
}

export interface CollabClientOptions {
  baseUrl?: string;
  workspaceId: string;
  tokenProvider?: () => Promise<string | null>;
  withCredentials?: boolean;
}

export type CollabClientEvent = 'connected' | 'disconnected' | 'members' | 'error';

export class CollabClient {
  private readonly options: CollabClientOptions;
  private socket: Socket | null = null;
  private readonly members = new Map<string, CollaboratorState>();
  private readonly listeners = new Map<CollabClientEvent, Set<(payload?: unknown) => void>>();

  constructor(options: CollabClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.socket) {
      return;
    }
    const token = (await this.options.tokenProvider?.()) ?? undefined;
    const base = this.options.baseUrl?.replace(/\/$/, '') ?? '';
    const url = `${base}/collab/${this.options.workspaceId}`;
    this.socket = io(url, {
      transports: ['websocket'],
      withCredentials: this.options.withCredentials ?? true,
      auth: token ? { token } : undefined,
    });
    this.registerHandlers(this.socket);
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.disconnect();
    this.socket = null;
    this.members.clear();
  }

  updateCursor(cursor: CollabCursor | null): void {
    if (!this.socket) {
      return;
    }
    this.socket.emit('presence.update', {
      cursor: cursor
        ? {
            field: cursor.field,
            position: cursor.position,
            valueLength: cursor.valueLength,
            selection: cursor.selection ?? null,
          }
        : null,
    });
  }

  getMembers(): CollaboratorState[] {
    return Array.from(this.members.values());
  }

  on(event: CollabClientEvent, handler: (payload?: unknown) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
    return () => {
      set.delete(handler);
    };
  }

  private registerHandlers(socket: Socket) {
    socket.on('connect', () => {
      this.emit('connected');
    });

    socket.on('disconnect', () => {
      this.emit('disconnected');
      this.members.clear();
      this.emit('members', this.getMembers());
    });

    socket.on('connect_error', (error: Error) => {
      this.emit('error', error);
    });

    socket.on('presence.sync', (payload: { members: Array<ServerPresenceState> }) => {
      this.members.clear();
      for (const member of payload.members ?? []) {
        this.upsertMember(member);
      }
      this.emit('members', this.getMembers());
    });

    socket.on('presence.join', (payload: { member: ServerPresenceState }) => {
      this.upsertMember(payload.member);
      this.emit('members', this.getMembers());
    });

    socket.on('presence.leave', (payload: { member: ServerPresenceState }) => {
      this.members.delete(payload.member.socketId);
      this.emit('members', this.getMembers());
    });

    socket.on('presence.update', (payload: { member: ServerPresenceState }) => {
      this.upsertMember(payload.member);
      this.emit('members', this.getMembers());
    });
  }

  private upsertMember(member: ServerPresenceState | undefined) {
    if (!member) {
      return;
    }
    const color = this.colorForUser(member.userId);
    const current = this.members.get(member.socketId);
    const next: CollaboratorState = {
      socketId: member.socketId,
      userId: member.userId,
      displayName: member.displayName,
      email: member.email ?? undefined,
      color,
      joinedAt: member.joinedAt,
      updatedAt: member.updatedAt,
      cursor: member.cursor ? { ...member.cursor } : null,
    };
    this.members.set(member.socketId, { ...current, ...next });
  }

  private emit(event: CollabClientEvent, payload?: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const handler of Array.from(listeners)) {
      try {
        handler(payload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[CollabClient] listener error', error);
      }
    }
  }

  private colorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i += 1) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  }
}

interface ServerPresenceState {
  socketId: string;
  userId: string;
  displayName: string;
  email?: string | null;
  joinedAt: string;
  updatedAt: string;
  cursor?: {
    field: string;
    position: number;
    valueLength: number;
    selection?: { start: number; end: number } | null;
  } | null;
}
