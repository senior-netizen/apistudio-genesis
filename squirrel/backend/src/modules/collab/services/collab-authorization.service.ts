import { Inject, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import type { Socket } from 'socket.io';
import appConfig from '../../../config/configuration';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { WorkspaceRole } from '../../../infra/prisma/enums';
import { resolveAccountRole } from '../../../common/security/owner-role.util';

export type AuthenticatedSocketUser = {
  id: string;
  email?: string;
  displayName: string;
  sessionId?: string;
};

export type WorkspaceMembership = {
  workspaceId: string;
  role: WorkspaceRole;
  user: { id: string; displayName: string; email?: string };
};

@Injectable()
export class CollabAuthorizationService {
  private readonly logger = new Logger(CollabAuthorizationService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async authenticate(client: Socket): Promise<AuthenticatedSocketUser> {
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException('Unauthorized');
    }
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email?: string;
        sid?: string;
        sessionId?: string;
        jti?: string;
      }>(token, { secret: this.config.jwt.secret });
      if (!payload?.sub) {
        throw new WsException('Unauthorized');
      }
      if (payload.jti) {
        const blacklisted = await this.redis.isTokenBlacklisted(payload.jti);
        if (blacklisted) {
          throw new WsException('Unauthorized');
        }
      }
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, displayName: true },
      });
      if (!user) {
        throw new WsException('Unauthorized');
      }
      return {
        id: user.id,
        email: user.email ?? undefined,
        displayName: user.displayName ?? 'Unknown',
        sessionId: payload.sid ?? payload.sessionId ?? undefined,
      };
    } catch (error) {
      this.logger.debug(`Failed to authenticate socket: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof WsException) throw error;
      throw new WsException('Unauthorized');
    }
  }

  async ensureWorkspaceAccess(userId: string, workspaceId?: string): Promise<WorkspaceMembership> {
    if (!workspaceId) {
      throw new WsException('Workspace identifier required');
    }
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: { user: { select: { id: true, displayName: true, email: true, role: true } } },
    });

    if (!membership) {
      // Allow global founder/admin to assist any workspace without explicit membership.
      const account = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, email: true, role: true },
      });
      const resolvedRole = account ? this.resolveAccountRole(account.email, account.role) : null;
      if (resolvedRole === 'founder' || resolvedRole === 'admin') {
        return {
          workspaceId,
          role: WorkspaceRole.OWNER,
          user: {
            id: account?.id ?? userId,
            displayName: account?.displayName ?? 'Founder',
            email: account?.email ?? undefined,
          },
        };
      }
      throw new WsException('Forbidden');
    }
    return {
      workspaceId,
      role: membership.role as WorkspaceRole,
      user: {
        id: membership.userId,
        displayName: membership.user?.displayName ?? 'Unknown',
        email: membership.user?.email ?? undefined,
      },
    };
  }

  async ensureOtherWorkspaceMember(targetUserId: string, workspaceId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });
    if (!membership) {
      throw new WsException('Target user is not a member of this workspace');
    }
  }

  async assertRequestInWorkspace(requestId: string | undefined, workspaceId: string): Promise<void> {
    if (!requestId) {
      return;
    }
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true, collection: { select: { workspaceId: true } } },
    });
    if (!request || request.collection?.workspaceId !== workspaceId) {
      throw new WsException('Request does not belong to workspace');
    }
  }

  private extractToken(client: Socket): string | null {
    const header = client.handshake.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    const authToken =
      (typeof client.handshake.auth?.token === 'string' && client.handshake.auth?.token?.length > 0
        ? (client.handshake.auth.token as string)
        : null) ??
      (typeof client.handshake.query?.token === 'string' ? (client.handshake.query.token as string) : null);
    return authToken;
  }

  private resolveAccountRole(email?: string | null, storedRole?: string | null) {
    return resolveAccountRole(email, storedRole);
  }
}
