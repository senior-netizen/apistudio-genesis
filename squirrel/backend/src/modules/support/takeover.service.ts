import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type TakeoverMode = 'VIEW_ONLY' | 'CO_CONTROL' | 'EMERGENCY_OVERRIDE';

interface TakeoverSessionState {
  sessionId: string;
  workspaceId: string;
  mode: TakeoverMode;
  targetUserId?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class TakeoverService {
  private readonly logger = new Logger(TakeoverService.name);
  private readonly sessions = new Map<string, TakeoverSessionState>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  getState(sessionId: string): TakeoverSessionState {
    return this.sessions.get(sessionId) ?? { sessionId, workspaceId: '', mode: 'VIEW_ONLY' };
  }

  async initialize(sessionId: string, workspaceId: string, targetUserId?: string | null) {
    const state: TakeoverSessionState = {
      sessionId,
      workspaceId,
      mode: 'VIEW_ONLY',
      targetUserId,
      expiresAt: null,
    };
    this.sessions.set(sessionId, state);
    return state;
  }

  async setMode(
    sessionId: string,
    workspaceId: string,
    mode: TakeoverMode,
    actorId: string,
    targetUserId?: string | null,
    reason?: string,
  ) {
    const existing = this.sessions.get(sessionId) ?? {
      sessionId,
      workspaceId,
      mode: 'VIEW_ONLY' as TakeoverMode,
      targetUserId,
      expiresAt: null,
    };
    const next: TakeoverSessionState = {
      ...existing,
      workspaceId,
      mode,
      targetUserId: targetUserId ?? existing.targetUserId,
      expiresAt: mode === 'EMERGENCY_OVERRIDE' ? new Date(Date.now() + 5 * 60 * 1000) : null,
    };
    this.sessions.set(sessionId, next);
    await this.logEvent(sessionId, actorId, targetUserId ?? existing.targetUserId ?? null, mode, reason);
    if (mode === 'EMERGENCY_OVERRIDE') {
      this.scheduleExpiry(sessionId, workspaceId, actorId, targetUserId ?? existing.targetUserId ?? null);
    } else {
      this.clearExpiry(sessionId);
    }
    return next;
  }

  async recordEvent(
    sessionId: string,
    actorId: string,
    targetUserId: string | null,
    mode: TakeoverMode,
    reason?: string,
  ) {
    await this.logEvent(sessionId, actorId, targetUserId, mode, reason);
  }

  async revertToViewOnly(sessionId: string, workspaceId: string, actorId: string, targetUserId?: string | null) {
    const current = this.sessions.get(sessionId);
    if (!current) {
      return this.initialize(sessionId, workspaceId, targetUserId);
    }
    const next: TakeoverSessionState = {
      ...current,
      mode: 'VIEW_ONLY',
      expiresAt: null,
    };
    this.sessions.set(sessionId, next);
    this.clearExpiry(sessionId);
    await this.logEvent(sessionId, actorId, targetUserId ?? current.targetUserId ?? null, 'VIEW_ONLY', 'AUTO_RESTORE');
    return next;
  }

  private scheduleExpiry(sessionId: string, workspaceId: string, actorId: string, targetUserId: string | null) {
    this.clearExpiry(sessionId);
    const timeout = setTimeout(() => {
      this.sessions.get(sessionId)?.mode === 'EMERGENCY_OVERRIDE' &&
        this.revertToViewOnly(sessionId, workspaceId, actorId, targetUserId ?? undefined).catch((error) => {
          this.logger.warn(
            `Failed to auto-revert takeover session ${sessionId}: ${error instanceof Error ? error.message : error}`,
          );
        });
    }, 5 * 60 * 1000);
    this.timers.set(sessionId, timeout);
  }

  private clearExpiry(sessionId: string) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  private async logEvent(
    sessionId: string,
    actorId: string,
    targetUserId: string | null,
    mode: TakeoverMode,
    reason?: string,
  ) {
    try {
      await this.prisma.supportTakeoverLog.create({
        data: {
          sessionId,
          actorId,
          targetUserId: targetUserId ?? undefined,
          mode,
          reason,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log takeover event: ${error instanceof Error ? error.message : error}`);
    }
  }
}
