import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CacheService } from '../../infra/cache/cache.service';
import { InviteDto } from './dto/invite.dto';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';
import appConfig from '../../config/configuration';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { CreateMagicInviteDto } from './dto/create-magic-invite.dto';
import { AcceptMagicInviteDto } from './dto/accept-magic-invite.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class WorkspacesService {
  private static readonly METADATA_TTL = 60;
  private static readonly TOKEN_BYTES = 32;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queues: QueueService,
    private readonly realtime: RealtimeGateway,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async listForUser(userId: string, page = 1, pageSize = 20) {
    const limit = Math.min(pageSize, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.workspace.findMany({
        where: { ownerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.workspace.count({ where: { ownerId: userId } }),
    ]);
    return {
      items,
      total,
      page,
      pageSize: limit,
    };
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = dto.slug ?? (await this.generateSlug(dto.name));
    const workspace = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          ownerId: userId,
          members: { create: { userId, role: 'OWNER' } },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await (tx as any).auditLog.create({
        data: ({
          workspaceId: created.id,
          actorId: userId,
          action: 'WORKSPACE_CREATED',
        } as any),
      });
      return created;
    });
    return workspace;
  }

  async getById(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!workspace) {
      throw new NotFoundException({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    }
    return workspace;
  }

  async getMetadata(workspaceId: string) {
    const cached = await this.cache.get<{ id: string; name: string; slug: string }>(`workspace:${workspaceId}`);
    if (cached) {
      return cached;
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, plan: true },
    });
    if (!workspace) {
      throw new BadRequestException({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    }
    await this.cache.set(`workspace:${workspaceId}`, workspace, WorkspacesService.METADATA_TTL);
    return workspace;
  }

  async invite(workspaceId: string, inviterId: string, dto: InviteDto) {
    await this.prisma.auditLog.create({
      data: ({
        workspaceId,
        actorId: inviterId,
        action: 'INVITE_SENT',
        metadata: { email: dto.email, role: dto.role },
      } as any),
    });
    const queue = this.queues.getQueue(QUEUES.WEBHOOK_DELIVER);
    await queue.add('workspace.invite', { workspaceId, email: dto.email, role: dto.role });
    return { status: 'sent' };
  }

  async createMagicInvite(workspaceId: string, inviterId: string, dto: CreateMagicInviteDto) {
    if (!this.config.magicInvites.enabled) {
      throw new BadRequestException({ code: 'MAGIC_INVITES_DISABLED', message: 'Magic invites are not enabled.' });
    }

    const inviterMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: inviterId } },
      select: { role: true },
    });
    if (!inviterMembership) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not a workspace member' });
    }

    if (!this.canAssignRole(inviterMembership.role as WorkspaceRole, dto.role)) {
      throw new BadRequestException({
        code: 'ROLE_TOO_PRIVILEGED',
        message: 'Invite role must not exceed inviter permissions',
      });
    }

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * (dto.expiresInHours ?? this.config.magicInvites.defaultTtlHours),
    );
    const token = randomBytes(WorkspacesService.TOKEN_BYTES).toString('hex');
    const link = await this.prisma.magicInviteLink.create({
      data: {
        workspaceId,
        inviterId,
        token,
        role: dto.role,
        expiresAt,
        metadata: dto.metadata,
      },
    });

    await this.prisma.auditLog.create({
      data: ({
        workspaceId,
        actorId: inviterId,
        action: 'invite.magic_link_created',
        metadata: { role: dto.role, expiresAt: expiresAt.toISOString(), tokenId: link.id },
      } as any),
    });

    return {
      magicUrl: `${this.config.magicInvites.baseUrl.replace(/\/$/, '')}/${token}`,
      expiresAt,
      role: dto.role,
    };
  }

  async acceptMagicInvite(dto: AcceptMagicInviteDto, user?: { id: string; email?: string; displayName?: string }) {
    if (!this.config.magicInvites.enabled) {
      throw new BadRequestException({ code: 'MAGIC_INVITES_DISABLED', message: 'Magic invites are not enabled.' });
    }

    const invite = await this.prisma.magicInviteLink.findUnique({
      where: { token: dto.token },
      include: { workspace: true },
    });

    if (!invite) {
      throw new NotFoundException({ code: 'INVITE_NOT_FOUND', message: 'Invite not found' });
    }
    if (invite.usedAt) {
      throw new BadRequestException({ code: 'INVITE_ALREADY_USED', message: 'This invite link has already been used.' });
    }
    const now = new Date();
    if (invite.expiresAt.getTime() < now.getTime()) {
      await this.prisma.auditLog.create({
        data: ({
          workspaceId: invite.workspaceId,
          actorId: invite.inviterId ?? undefined,
          action: 'invite.magic_link_expired',
          metadata: { tokenId: invite.id },
        } as any),
      });
      throw new BadRequestException({ code: 'INVITE_EXPIRED', message: 'This invite link has expired.' });
    }

    if (!user) {
      throw new ForbiddenException({ code: 'AUTH_REQUIRED', message: 'Please sign in to accept this invite.' });
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.magicInviteLink.findUnique({ where: { id: invite.id }, select: { usedAt: true, metadata: true, role: true, inviterId: true } });
      if (!locked || locked.usedAt) {
        throw new BadRequestException({ code: 'INVITE_ALREADY_USED', message: 'This invite link has already been used.' });
      }

      const member = await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
        update: { role: invite.role, invitedById: invite.inviterId ?? undefined },
        create: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
          invitedById: invite.inviterId ?? undefined,
        },
      });

      await tx.magicInviteLink.update({
        where: { id: invite.id },
        data: { usedAt: now, metadata: { ...(locked.metadata ?? {}), acceptedBy: user.id } },
      });

      await tx.auditLog.create({
        data: ({
          workspaceId: invite.workspaceId,
          actorId: user.id,
          action: 'invite.magic_link_accepted',
          metadata: { tokenId: invite.id, roleAssigned: member.role },
        } as any),
      });

      await tx.securityEvent.create({
        data: ({
          workspaceId: invite.workspaceId,
          actorId: user.id,
          eventType: 'invite.magic_link_used',
          description: 'Magic invite link redeemed',
        } as any),
      });

      return member;
    });

    const memberProfile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, displayName: true, email: true },
    });

    if (memberProfile) {
      this.realtime.server
        ?.to(`workspace:${invite.workspaceId}`)
        .emit('workspace.member_joined', {
          workspaceId: invite.workspaceId,
          newMember: {
            id: memberProfile.id,
            name: memberProfile.displayName,
            email: memberProfile.email,
            role: membership.role,
          },
          invitedBy: invite.inviterId,
          timestamp: Date.now(),
        });
    }

    return {
      workspaceId: invite.workspaceId,
      roleAssigned: membership.role,
      status: 'joined',
    };
  }

  private canAssignRole(inviterRole: WorkspaceRole, desired: WorkspaceRole) {
    const order = [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER];
    return order.indexOf(inviterRole) >= order.indexOf(desired);
  }

  private async generateSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 32);
    const safeBase = base || `workspace-${Date.now()}`;
    let slug = safeBase;
    let counter = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${safeBase}-${counter++}`;
    }
    return slug;
  }
}
