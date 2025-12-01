// AuthDomainService orchestrates auth flows while emitting integration events for future microservices.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../modules/auth/auth.service';
import { RegisterDto } from '../../modules/auth/dto/register.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { UsersService } from '../../modules/users/users.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EVENT_BUS, EventBus } from '../../events/bus/event-bus.interface';
import { createUserCreatedEvent, createUserLoggedInEvent } from '../../events/contracts';

@Injectable()
export class AuthDomainService {
  private readonly logger = new Logger(AuthDomainService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * Proxy registration through the existing AuthService and emit UserCreated + WorkspaceCreated events.
   * This keeps the monolith behavior unchanged while allowing asynchronous consumers to react.
   */
  async registerUser(dto: RegisterDto) {
    const tokens = await this.authService.register(dto);
    const identity = this.decodeIdentity(tokens.accessToken);
    if (!identity?.userId) {
      this.logger.warn('Unable to decode identity from access token after registration');
      return tokens;
    }

    const user = await this.usersService.findById(identity.userId);
    const workspace = await this.resolveWorkspace(identity.userId);

    if (user) {
      await this.eventBus.publish(
        createUserCreatedEvent({ userId: user.id, email: user.email, workspaceId: workspace?.id }),
      );
    }

    if (workspace) {
      const { createWorkspaceCreatedEvent } = await import('../../events/contracts/workspace.events');
      await this.eventBus.publish(
        createWorkspaceCreatedEvent({
          workspaceId: workspace.id,
          ownerId: workspace.ownerId,
          name: workspace.name,
          slug: workspace.slug,
        }),
      );
    }

    return tokens;
  }

  /**
   * Keep login flow intact while emitting an immutable login audit event.
   */
  async loginUser(dto: LoginDto) {
    const tokens = await this.authService.login(dto);
    const identity = this.decodeIdentity(tokens.accessToken);
    if (identity?.userId && identity.email) {
      await this.eventBus.publish(
        createUserLoggedInEvent({ userId: identity.userId, email: identity.email, sessionId: identity.sid }),
      );
    }
    return tokens;
  }

  private decodeIdentity(token: string): { userId?: string; email?: string; sid?: string } | null {
    try {
      const payload = this.jwtService.decode(token) as { sub?: string; email?: string; sid?: string } | null;
      if (!payload) return null;
      return { userId: payload.sub, email: payload.email, sid: payload.sid };
    } catch (error) {
      this.logger.warn('Failed to decode access token for domain events');
      this.logger.debug(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async resolveWorkspace(userId: string) {
    try {
      return await this.prisma.workspace.findFirst({ where: { ownerId: userId } });
    } catch (error) {
      this.logger.warn('Failed to resolve workspace for user', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}
