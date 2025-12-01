import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { resolveAccountRole } from '../../common/security/owner-role.util';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class GrpcJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rpcContext = context.switchToRpc();
    const metadata = rpcContext.getContext<Metadata>();
    const token = this.extractToken(metadata);
    if (!token) {
      throw new UnauthorizedException({ code: 'AUTH_401', message: 'Authorization metadata missing' });
    }
    const secret = this.config.get<string>('app.jwt.secret');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email?: string; role?: string; sid?: string }>(token, {
        secret,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { email: true, role: true },
      });
      const email = user?.email ?? payload.email ?? 'unknown@squirrel.local';
      const role = resolveAccountRole(email, user?.role ?? payload.role);
      (metadata as any).__user = { id: payload.sub, email, role, sessionId: payload.sid };
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        code: 'AUTH_401',
        message: 'Unauthorized — token missing or invalid',
      });
    }
  }

  private extractToken(metadata?: Metadata): string | null {
    if (!metadata) return null;
    const header = metadata.get('authorization')?.[0];
    if (typeof header === 'string') {
      const parts = header.split(' ');
      if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
        return parts[1].trim();
      }
      return header.trim();
    }
    return null;
  }
}
