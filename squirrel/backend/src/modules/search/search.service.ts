import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: { id: string; role?: string }, query: string, workspaceId?: string) {
    const isElevated = user.role === 'founder' || user.role === 'admin';

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    const owned = await this.prisma.workspace.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const accessibleWorkspaceIds = new Set<string>([
      ...memberships.map((m) => m.workspaceId),
      ...owned.map((o) => o.id),
    ]);

    if (workspaceId && !accessibleWorkspaceIds.has(workspaceId) && !isElevated) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not a member of the requested workspace' });
    }

    const workspaceFilter = workspaceId
      ? { workspaceId }
      : { workspaceId: { in: Array.from(accessibleWorkspaceIds.values()) } };

    const [collections, requests, workspaces, users, apiKeys, auditLogs] = await Promise.all([
      this.prisma.collection.findMany({
        where: { ...workspaceFilter, name: { contains: query, mode: 'insensitive' } },
        take: 10,
      }),
      this.prisma.request.findMany({
        where: { collection: workspaceFilter, name: { contains: query, mode: 'insensitive' } },
        take: 10,
      }),
      this.prisma.workspace.findMany({
        where: isElevated
          ? { name: { contains: query, mode: 'insensitive' } }
          : { ...workspaceFilter, name: { contains: query, mode: 'insensitive' } },
        take: 10,
        select: { id: true, name: true, slug: true, ownerId: true },
      }),
      isElevated
        ? this.prisma.user.findMany({
            where: {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { displayName: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: { id: true, email: true, displayName: true, role: true },
            take: 10,
          })
        : Promise.resolve([]),
      this.prisma.adminApiKey.findMany({
        where: {
          revoked: false,
          ...(isElevated ? {} : workspaceFilter),
          OR: [
            { description: { contains: query, mode: 'insensitive' } },
            { scopes: { has: query } },
          ],
        },
        select: {
          id: true,
          keyPrefix: true,
          scopes: true,
          workspaceId: true,
          type: true,
          description: true,
        },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        where: {
          ...(isElevated ? {} : workspaceFilter),
          OR: [
            { action: { contains: query, mode: 'insensitive' } },
            { metadata: { path: ['message'], string_contains: query } },
          ],
        },
        select: { id: true, action: true, workspaceId: true, createdAt: true, actorId: true, metadata: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { collections, requests, workspaces, users, apiKeys, auditLogs };
  }
}
