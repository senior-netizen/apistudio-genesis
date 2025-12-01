import { WorkspaceRole } from '../../infra/prisma/enums';

export type PresenceState = {
  socketId: string;
  userId: string;
  displayName: string;
  email?: string;
  role: WorkspaceRole;
  status: 'active' | 'idle' | 'away';
  typing?: boolean;
  cursor?: CursorState;
  joinedAt: string;
  updatedAt: string;
};

export type CursorState = {
  position: number;
  selection?: { start: number; end: number };
  color?: string;
};

export type AwarenessSnapshot = Record<string, CursorState & { userId: string }>; // keyed by socketId

export type LogEntry = {
  timestamp: string;
  userId?: string;
  requestId?: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  sizeBytes?: number;
  environment?: string | null;
  error?: string;
};

export type PairSessionState = {
  sessionId: string;
  workspaceId: string;
  requestId?: string | null;
  driverId: string;
  navigatorId: string;
  startedAt: string;
  endedAt?: string | null;
};
