import { createHash } from 'crypto';
import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { resolveAccountRole } from '../security/owner-role.util';
import { elevateFounderRole } from '../../../../shared/rbac/roles';
import { compare as bcryptCompare } from 'bcryptjs';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from '../decorators/public-route.decorator';

type AuthenticatedUser = NonNullable<Request['user']>;

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private hasLoggedBypassWarning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (this.isDeveloperBypassEnabled()) {
      request.user = {
        id: 'dev-bypass',
        email: 'dev@squirrel.local',
        role: 'founder',
        developerBypass: true,
      } as AuthenticatedUser;
      return true;
    }

    const apiKey = this.extractApiKey(request);
    if (apiKey) {
      const apiKeyUser = await this.validateApiKey(apiKey);
      if (apiKeyUser) {
        request.user = apiKeyUser;
        return true;
      }
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      this.logger.warn(`JWT guard rejection: ${error instanceof Error ? error.message : error}`);
      throw new UnauthorizedException({
        ok: false,
        message: 'Unauthorized — token missing or invalid',
        code: 'AUTH_401',
      });
    }
  }

  handleRequest(err: unknown, user: any, info: unknown, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const result = super.handleRequest(err, user, info, context);
    if (!result) {
      throw new UnauthorizedException({
        ok: false,
        message: 'Unauthorized — token missing or invalid',
        code: 'AUTH_401',
      });
    }

    const elevatedUser = elevateFounderRole(result as any);
    const effectiveRole = resolveAccountRole(elevatedUser.email, elevatedUser.role, elevatedUser.isFounder);
    result.role = effectiveRole;
    if (elevatedUser.isFounder || effectiveRole === 'founder') {
      (result as any).isFounder = true;
    }
    if (request) {
      request.user = result;
    }
    return result;
  }

  private isDeveloperBypassEnabled() {
    const bypassEnabled = this.config.get<boolean>('app.authDeveloperBypass') === true;
    if (!bypassEnabled) {
      return false;
    }

    const nodeEnv = (this.config.get<string>('app.nodeEnv') ?? process.env.NODE_ENV ?? 'development').toLowerCase();
    const safeEnvironments = new Set(['development', 'test']);
    if (!safeEnvironments.has(nodeEnv)) {
      if (!this.hasLoggedBypassWarning) {
        this.logger.warn(
          `AUTH_DEV_BYPASS is enabled but NODE_ENV is "${nodeEnv}" — ignoring bypass for safety. Disable AUTH_DEV_BYPASS outside development.`,
        );
        this.hasLoggedBypassWarning = true;
      }
      return false;
    }

    if (!this.hasLoggedBypassWarning) {
      this.logger.warn('AUTH_DEV_BYPASS is enabled. All requests will be auto-authenticated as founder.');
      this.hasLoggedBypassWarning = true;
    }

    return true;
  }

  private extractApiKey(request: Request): string | null {
    const headerKey = (request.headers['x-api-key'] as string | undefined)?.trim();
    if (headerKey) return headerKey;
    const queryKey = typeof request.query['apiKey'] === 'string' ? request.query['apiKey'] : null;
    return queryKey?.trim() || null;
  }

  private async validateApiKey(rawKey: string): Promise<AuthenticatedUser | null> {
    try {
      const shaHash = createHash('sha256').update(rawKey).digest('hex');
      const byHash = await this.prisma.apiKey.findFirst({
        where: {
          keyHash: shaHash,
          revoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true, workspaceId: true, projectId: true },
      });
      if (byHash) {
        return {
          id: `api-key:${byHash.id}`,
          email: 'api-key@squirrel.local',
          role: 'api_key',
          apiKeyId: byHash.id,
          workspaceId: byHash.workspaceId,
        } as AuthenticatedUser;
      }

      const recentKeys = await this.prisma.apiKey.findMany({
        where: {
          revoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, keyHash: true, workspaceId: true, projectId: true },
      });
      for (const key of recentKeys) {
        if (await bcryptCompare(rawKey, key.keyHash)) {
          return {
            id: `api-key:${key.id}`,
            email: 'api-key@squirrel.local',
            role: 'api_key',
            apiKeyId: key.id,
            workspaceId: key.workspaceId,
          } as AuthenticatedUser;
        }
      }
    } catch (error) {
      this.logger.warn(`API key validation failed: ${error instanceof Error ? error.message : error}`);
    }
    return null;
  }
}
