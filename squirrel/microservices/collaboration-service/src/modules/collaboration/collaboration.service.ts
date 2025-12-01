import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { KafkaProvider } from '../../common/kafka/kafka.provider';
import { CollabTopics } from './events';

type CollaborationPrisma = PrismaService & {
  collaborationInvite: any;
  collaborationShareLink: any;
  collaborationSession: any;
  collaborationResidency: any;
  collaborationComment: any;
  collaborationActivity: any;
  workspaceMember: any;
};

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: CollaborationPrisma, private readonly kafka: KafkaProvider) {}

  private async ensureWorkspace(workspaceId: string) {
    // If workspaces are managed in another service, we simply trust the id here; otherwise verify existence.
    return workspaceId;
  }

  async getState(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    const [members, invites, shareLinks, sessions, residency, comments, activity] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.collaborationInvite.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.collaborationShareLink.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.collaborationSession.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.collaborationResidency.findMany({ where: { workspaceId }, orderBy: { primary: 'desc' } }),
      this.prisma.collaborationComment.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.collaborationActivity.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    return {
      members: members.map((member) => ({
        id: member.userId,
        name: member.user?.displayName ?? 'Unknown',
        email: member.user?.email ?? '',
        role: member.role,
        presence: 'offline' as const,
        lastActiveAt: new Date().toISOString(),
      })),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedBy: invite.invitedBy,
        status: invite.status,
        message: invite.message,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      })),
      shareLinks: shareLinks.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        scope: link.scope as 'workspace' | 'collection',
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() ?? null,
        status: link.status,
        requiresApproval: link.requiresApproval,
        maxUses: link.maxUses,
        usageCount: link.usageCount,
      })),
      liveSessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        hostId: session.hostId,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        timezone: session.timezone,
        participants: Array.isArray(session.participants) ? (session.participants as string[]) : [],
        agenda: session.agenda,
      })),
      residency: residency.map((entry) => ({
        region: entry.region,
        dataCenter: entry.dataCenter,
        primary: entry.primary,
        status: entry.status,
        cutoverAt: entry.cutoverAt?.toISOString() ?? null,
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        userId: comment.userId,
        userName: comment.userName,
        message: comment.message,
        createdAt: comment.createdAt.toISOString(),
      })),
      activity: activity.map((entry) => ({
        id: entry.id,
        type: entry.type,
        actor: entry.actor,
        message: entry.message,
        severity: entry.severity,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  private async recordActivity(workspaceId: string, payload: { type: string; actor?: string | null; message: string; severity?: string }) {
    await this.prisma.collaborationActivity.create({
      data: {
        workspaceId,
        type: payload.type,
        actor: payload.actor,
        message: payload.message,
        severity: payload.severity ?? 'info',
      },
    });
  }

  async createInvite(workspaceId: string, payload: { email: string; role: string; message?: string; invitedBy?: string }) {
    await this.ensureWorkspace(workspaceId);
    const now = new Date();
    await this.prisma.collaborationInvite.create({
      data: {
        workspaceId,
        email: payload.email,
        role: payload.role,
        invitedBy: payload.invitedBy,
        status: 'pending',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
        message: payload.message,
      },
    });
    await this.recordActivity(workspaceId, {
      type: 'invite-sent',
      actor: payload.invitedBy,
      message: `Sent ${payload.role} invite to ${payload.email}.`,
    });
    await this.kafka.emit(CollabTopics.InviteCreated, { workspaceId, email: payload.email, role: payload.role });
    return this.getState(workspaceId);
  }

  async revokeInvite(workspaceId: string, inviteId: string) {
    const invite = await this.prisma.collaborationInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new NotFoundException('Invite not found');
    }
    await this.prisma.collaborationInvite.update({ where: { id: inviteId }, data: { status: 'revoked' } });
    await this.recordActivity(workspaceId, {
      type: 'invite-revoked',
      actor: invite.invitedBy,
      message: `Revoked invite for ${invite.email}.`,
      severity: 'warning',
    });
    await this.kafka.emit(CollabTopics.InviteRevoked, { workspaceId, inviteId });
    return this.getState(workspaceId);
  }

  async createShareLink(
    workspaceId: string,
    payload: { label: string; scope: 'workspace' | 'collection'; expiresInHours?: number; requiresApproval?: boolean; maxUses?: number },
  ) {
    const now = new Date();
    await this.prisma.collaborationShareLink.create({
      data: {
        workspaceId,
        label: payload.label,
        url: `https://studio.squirrel.dev/share/${randomUUID()}`,
        scope: payload.scope,
        createdAt: now,
        expiresAt: payload.expiresInHours ? new Date(now.getTime() + payload.expiresInHours * 3600 * 1000) : undefined,
        status: 'active',
        requiresApproval: payload.requiresApproval ?? false,
        maxUses: payload.maxUses,
        usageCount: 0,
      },
    });
    await this.recordActivity(workspaceId, {
      type: 'link-created',
      actor: null,
      message: `Created ${payload.scope} link "${payload.label}".`,
    });
    await this.kafka.emit(CollabTopics.ShareLinkCreated, { workspaceId, label: payload.label, scope: payload.scope });
    return this.getState(workspaceId);
  }

  async revokeShareLink(workspaceId: string, linkId: string) {
    const link = await this.prisma.collaborationShareLink.findUnique({ where: { id: linkId } });
    if (!link || link.workspaceId !== workspaceId) {
      throw new NotFoundException('Share link not found');
    }
    await this.prisma.collaborationShareLink.update({ where: { id: linkId }, data: { status: 'revoked' } });
    await this.recordActivity(workspaceId, {
      type: 'link-revoked',
      actor: null,
      message: `Revoked link "${link.label}".`,
      severity: 'warning',
    });
    await this.kafka.emit(CollabTopics.ShareLinkRevoked, { workspaceId, linkId });
    return this.getState(workspaceId);
  }

  async scheduleSession(
    workspaceId: string,
    payload: { title: string; hostId: string; scheduledAt: string; timezone: string; agenda?: string | null },
  ) {
    await this.prisma.collaborationSession.create({
      data: {
        workspaceId,
        title: payload.title,
        hostId: payload.hostId,
        status: 'scheduled',
        startedAt: new Date(payload.scheduledAt),
        timezone: payload.timezone,
        participants: [payload.hostId],
        agenda: payload.agenda,
      },
    });
    await this.recordActivity(workspaceId, {
      type: 'session-scheduled',
      actor: null,
      message: `Scheduled live session "${payload.title}".`,
    });
    await this.kafka.emit(CollabTopics.SessionScheduled, { workspaceId, title: payload.title, hostId: payload.hostId });
    return this.getState(workspaceId);
  }

  async startSession(workspaceId: string, sessionId: string) {
    const session = await this.prisma.collaborationSession.findUnique({ where: { id: sessionId } });
    if (!session || session.workspaceId !== workspaceId) {
      throw new NotFoundException('Session not found');
    }
    await this.prisma.collaborationSession.update({ where: { id: sessionId }, data: { status: 'live', startedAt: new Date() } });
    await this.recordActivity(workspaceId, {
      type: 'session-started',
      actor: null,
      message: `Started live session "${session.title}".`,
    });
    await this.kafka.emit(CollabTopics.SessionStarted, { workspaceId, sessionId });
    return this.getState(workspaceId);
  }

  async endSession(workspaceId: string, sessionId: string) {
    const session = await this.prisma.collaborationSession.findUnique({ where: { id: sessionId } });
    if (!session || session.workspaceId !== workspaceId) {
      throw new NotFoundException('Session not found');
    }
    await this.prisma.collaborationSession.update({ where: { id: sessionId }, data: { status: 'ended' } });
    await this.recordActivity(workspaceId, {
      type: 'session-ended',
      actor: null,
      message: `Ended live session "${session.title}".`,
    });
    await this.kafka.emit(CollabTopics.SessionEnded, { workspaceId, sessionId });
    return this.getState(workspaceId);
  }

  async addComment(workspaceId: string, payload: { userId: string; userName?: string; message: string }) {
    await this.prisma.collaborationComment.create({
      data: {
        workspaceId,
        userId: payload.userId,
        userName: payload.userName ?? 'User',
        message: payload.message,
      },
    });
    await this.recordActivity(workspaceId, {
      type: 'comment',
      actor: payload.userName,
      message: `Commented: ${payload.message.slice(0, 80)}`,
    });
    await this.kafka.emit(CollabTopics.CommentAdded, { workspaceId, userId: payload.userId });
    return this.getState(workspaceId);
  }

  async getActivity(workspaceId: string) {
    const activity = await this.prisma.collaborationActivity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return activity.map((entry) => ({
      id: entry.id,
      type: entry.type,
      actor: entry.actor,
      message: entry.message,
      severity: entry.severity,
      createdAt: entry.createdAt.toISOString(),
    }));
  }
}
