import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { Request } from 'express';

export const ROLES_KEY = 'roles';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string; role?: WorkspaceRole | string } | undefined;
    if (!user) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not authenticated' });
    }
    let role: WorkspaceRole;
    const normalizedAccountRole = user.role ? String(user.role).toLowerCase() : null;
    if (normalizedAccountRole === 'founder' || normalizedAccountRole === 'admin') {
      // Global founder/admin bypass workspace-level RBAC but we still normalize to OWNER for downstream checks.
      request.user = { ...user, role: WorkspaceRole.OWNER } as any;
      return true;
    }
    if (user.role && Object.values(WorkspaceRole).includes(user.role as WorkspaceRole)) {
      role = user.role as WorkspaceRole;
    } else {
      const workspaceId = request.headers['x-workspace-id'];
      if (!workspaceId || typeof workspaceId !== 'string') {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Workspace not provided' });
      }
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not a workspace member' });
      }
      role = membership.role as WorkspaceRole;
      const enrichedUser: Request['user'] = { ...user, role };
      request.user = enrichedUser;
    }
    const order = [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER];
    const requiredMin = Math.min(...required.map((r) => order.indexOf(r)));
    const current = order.indexOf(role);
    if (current === -1 || current < requiredMin) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    return true;
  }
}
