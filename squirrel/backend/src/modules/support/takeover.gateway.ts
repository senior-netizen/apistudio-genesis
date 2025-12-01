import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { ConfigType } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import appConfig from '../../config/configuration';
import { RedisService } from '../../infra/redis/redis.service';
import { configureSocketAdapter } from '../collab/utils/socket-adapter.util';
import { CollabAuthorizationService, AuthenticatedSocketUser } from '../collab/services/collab-authorization.service';
import { TakeoverService } from './takeover.service';
import { WorkspaceRole } from '../../infra/prisma/enums';

interface SessionContext {
  sessionId: string;
  workspaceId?: string;
  targetUserId?: string | null;
}

@WebSocketGateway({ namespace: /\/takeover\/.+/, cors: { origin: '*' } })
export class TakeoverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TakeoverGateway.name);
  private readonly sessions = new WeakMap<Socket, SessionContext>();
  private readonly users = new WeakMap<Socket, AuthenticatedSocketUser>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly auth: CollabAuthorizationService,
    private readonly takeover: TakeoverService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; takeover namespace running without shared adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('takeover:pub');
      const subClient = this.redis.duplicate('takeover:sub');
      await configureSocketAdapter(this.logger, this.server, pubClient, subClient);
    } catch (error) {
      this.logger.warn(`Failed to configure takeover adapter: ${error instanceof Error ? error.message : error}`);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const user = await this.auth.authenticate(client);
      this.users.set(client, user);
      const sessionId = this.extractSessionId(client.nsp?.name);
      if (!sessionId) {
        throw new WsException('Session identifier missing');
      }
      this.sessions.set(client, { sessionId });
    } catch (error) {
      this.logger.debug(`Takeover socket rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.sessions.delete(client);
    this.users.delete(client);
  }

  @SubscribeMessage('takeover.join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; targetUserId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    context.workspaceId = body.workspaceId;
    context.targetUserId = body.targetUserId;
    const state = await this.takeover.initialize(context.sessionId, body.workspaceId, body.targetUserId);
    client.nsp.emit('takeover.state', { sessionId: context.sessionId, state });
  }

  @SubscribeMessage('takeover.request_view')
  async requestView(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; targetUserId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    const membership = await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    this.assertSupportRole(membership.role);
    context.workspaceId = body.workspaceId;
    context.targetUserId = body.targetUserId ?? context.targetUserId;
    await this.takeover.recordEvent(
      context.sessionId,
      user.id,
      context.targetUserId ?? null,
      'VIEW_ONLY',
      'REQUESTED',
    );
    client.nsp.emit('takeover.view_requested', {
      sessionId: context.sessionId,
      workspaceId: body.workspaceId,
      actorId: user.id,
      targetUserId: context.targetUserId ?? null,
    });
  }

  @SubscribeMessage('takeover.accept_view')
  async acceptView(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; actorId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    if (!context.workspaceId) {
      context.workspaceId = body.workspaceId;
    }
    await this.auth.ensureWorkspaceAccess(user.id, context.workspaceId ?? body.workspaceId);
    const state = await this.takeover.setMode(
      context.sessionId,
      context.workspaceId ?? body.workspaceId,
      'VIEW_ONLY',
      user.id,
      context.targetUserId ?? null,
      'ACCEPTED',
    );
    client.nsp.emit('takeover.state', { sessionId: context.sessionId, state });
  }

  @SubscribeMessage('takeover.decline_view')
  async declineView(@ConnectedSocket() client: Socket, @MessageBody() body: { workspaceId: string }) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    await this.auth.ensureWorkspaceAccess(user.id, context.workspaceId ?? body.workspaceId);
    await this.takeover.recordEvent(context.sessionId, user.id, context.targetUserId ?? null, 'VIEW_ONLY', 'DECLINED');
    client.nsp.emit('takeover.view_declined', {
      sessionId: context.sessionId,
      actorId: user.id,
      workspaceId: context.workspaceId ?? body.workspaceId,
    });
  }

  @SubscribeMessage('takeover.request_co_control')
  async requestCoControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; targetUserId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    const membership = await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    this.assertSupportRole(membership.role);
    context.workspaceId = body.workspaceId;
    context.targetUserId = body.targetUserId ?? context.targetUserId;
    await this.takeover.recordEvent(
      context.sessionId,
      user.id,
      context.targetUserId ?? null,
      'CO_CONTROL',
      'REQUESTED',
    );
    client.nsp.emit('takeover.co_control_requested', {
      sessionId: context.sessionId,
      workspaceId: body.workspaceId,
      actorId: user.id,
      targetUserId: context.targetUserId ?? null,
    });
  }

  @SubscribeMessage('takeover.respond_co_control')
  async respondCoControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; accept: boolean },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    await this.auth.ensureWorkspaceAccess(user.id, context.workspaceId ?? body.workspaceId);
    if (body.accept) {
      const state = await this.takeover.setMode(
        context.sessionId,
        context.workspaceId ?? body.workspaceId,
        'CO_CONTROL',
        user.id,
        context.targetUserId ?? null,
        'ACCEPTED',
      );
      client.nsp.emit('takeover.state', { sessionId: context.sessionId, state });
    } else {
      await this.takeover.recordEvent(
        context.sessionId,
        user.id,
        context.targetUserId ?? null,
        'CO_CONTROL',
        'DECLINED',
      );
      client.nsp.emit('takeover.co_control_declined', {
        sessionId: context.sessionId,
        actorId: user.id,
      });
    }
  }

  @SubscribeMessage('takeover.emergency_override')
  async emergencyOverride(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; reason: string; targetUserId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    if (!body.reason || body.reason.trim().length === 0) {
      throw new WsException('Override reason required');
    }
    const membership = await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    if (membership.role !== WorkspaceRole.OWNER) {
      throw new WsException('Emergency override restricted to owners');
    }
    context.workspaceId = body.workspaceId;
    context.targetUserId = body.targetUserId ?? context.targetUserId;
    const state = await this.takeover.setMode(
      context.sessionId,
      body.workspaceId,
      'EMERGENCY_OVERRIDE',
      user.id,
      context.targetUserId ?? null,
      body.reason,
    );
    client.nsp.emit('takeover.state', { sessionId: context.sessionId, state });
  }

  @SubscribeMessage('takeover.end')
  async endTakeover(@ConnectedSocket() client: Socket, @MessageBody() body: { workspaceId: string }) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const context = this.requireSession(client);
    const membership = await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    this.assertSupportRole(membership.role);
    const state = await this.takeover.setMode(
      context.sessionId,
      body.workspaceId,
      'VIEW_ONLY',
      user.id,
      context.targetUserId ?? null,
      'ENDED',
    );
    client.nsp.emit('takeover.state', { sessionId: context.sessionId, state });
  }

  private extractSessionId(namespace?: string | null): string | null {
    if (!namespace) {
      return null;
    }
    const segments = namespace.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    return segments[1] ?? null;
  }

  private requireSession(client: Socket): SessionContext {
    const context = this.sessions.get(client);
    if (!context) {
      throw new WsException('Session not initialized');
    }
    return context;
  }

  private requireUser(client: Socket): AuthenticatedSocketUser {
    const user = this.users.get(client);
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private assertSupportRole(role: WorkspaceRole) {
    if (![WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(role)) {
      throw new WsException('Insufficient privileges for takeover');
    }
  }

  private ensureFeatureEnabled() {
    if (!this.config.features.collabEnabled) {
      throw new WsException('Collaboration disabled');
    }
  }
}
