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
import { configureSocketAdapter } from './utils/socket-adapter.util';
import { CollabAuthorizationService, AuthenticatedSocketUser } from './services/collab-authorization.service';
import { CollabLogsService } from './services/logs.service';

@WebSocketGateway({ namespace: '/logs', cors: { origin: '*' } })
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LogsGateway.name);
  private readonly workspaces = new WeakMap<Socket, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly auth: CollabAuthorizationService,
    private readonly logs: CollabLogsService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.logs.onLog((workspaceId, entry) => {
      this.server.to(this.roomName(workspaceId)).emit('logs.entry', { workspaceId, entry });
    });
  }

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; logs namespace running without shared adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('logs:pub');
      const subClient = this.redis.duplicate('logs:sub-adapter');
      await configureSocketAdapter(this.logger, this.server, pubClient, subClient);
    } catch (error) {
      this.logger.warn(`Failed to configure logs adapter: ${error instanceof Error ? error.message : error}`);
    }
  }

  async handleConnection(client: Socket) {
    if (!this.config.features.liveLogsEnabled) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.authenticate(client);
      client.data.user = user;
      this.workspaces.set(client, new Set());
    } catch (error) {
      this.logger.debug(`Logs socket rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.workspaces.delete(client);
  }

  @SubscribeMessage('logs.subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; limit?: number },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const membership = await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    // membership ensures workspace access
    const room = this.roomName(body.workspaceId);
    await client.join(room);
    this.workspaces.get(client)?.add(body.workspaceId);
    const entries = await this.logs.getRecent(body.workspaceId, body.limit ?? 50);
    client.emit('logs.snapshot', { workspaceId: body.workspaceId, entries });
    this.logger.debug(`User ${user.id} subscribed to workspace ${body.workspaceId} logs as ${membership.role}`);
  }

  @SubscribeMessage('logs.unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { workspaceId: string }) {
    this.ensureFeatureEnabled();
    const room = this.roomName(body.workspaceId);
    client.leave(room);
    this.workspaces.get(client)?.delete(body.workspaceId);
  }

  private requireUser(client: Socket): AuthenticatedSocketUser {
    const user = client.data.user as AuthenticatedSocketUser | undefined;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private roomName(workspaceId: string) {
    return `logs:workspace:${workspaceId}`;
  }

  private ensureFeatureEnabled() {
    if (!this.config.features.liveLogsEnabled) {
      throw new WsException('Live logs disabled');
    }
  }
}
