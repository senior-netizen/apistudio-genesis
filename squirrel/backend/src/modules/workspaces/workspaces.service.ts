import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CacheService } from '../../infra/cache/cache.service';
import { InviteDto } from './dto/invite.dto';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

@Injectable()
export class WorkspacesService {
  private static readonly METADATA_TTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queues: QueueService,
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
