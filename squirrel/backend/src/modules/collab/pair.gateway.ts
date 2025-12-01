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
import { PairService } from './services/pair.service';

@WebSocketGateway({ namespace: '/pair', cors: { origin: '*' } })
export class PairGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PairGateway.name);
  private readonly rooms = new WeakMap<Socket, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly auth: CollabAuthorizationService,
    private readonly pairService: PairService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; pair namespace running without shared adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('pair:pub');
      const subClient = this.redis.duplicate('pair:sub');
      await configureSocketAdapter(this.logger, this.server, pubClient, subClient);
    } catch (error) {
      this.logger.warn(`Failed to configure pair adapter: ${error instanceof Error ? error.message : error}`);
    }
  }

  async handleConnection(client: Socket) {
    if (!this.config.features.pairDebugEnabled) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.authenticate(client);
      client.data.user = user;
      this.rooms.set(client, new Set());
    } catch (error) {
      this.logger.debug(`Pair socket rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.rooms.delete(client);
  }

  @SubscribeMessage('pair.join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    await this.auth.ensureWorkspaceAccess(user.id, body.workspaceId);
    await this.auth.assertRequestInWorkspace(body.requestId, body.workspaceId);
    const room = this.roomName(body.workspaceId, body.requestId);
    await client.join(room);
    this.rooms.get(client)?.add(room);
    const active = await this.pairService.getActiveSession(body.workspaceId, body.requestId);
    if (active) {
      client.emit('pair.state', active);
    }
  }

  @SubscribeMessage('pair.request_control')
  async handleRequestControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    await this.ensureRoomJoined(client, body.workspaceId, body.requestId);
    this.server.to(this.roomName(body.workspaceId, body.requestId)).emit('pair.request_control', {
      workspaceId: body.workspaceId,
      requestId: body.requestId,
      userId: user.id,
    });
  }

  @SubscribeMessage('pair.grant_control')
  async handleGrantControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string; targetUserId: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    await this.ensureRoomJoined(client, body.workspaceId, body.requestId);
    await this.auth.ensureOtherWorkspaceMember(body.targetUserId, body.workspaceId);
    const session = await this.pairService.startSession({
      workspaceId: body.workspaceId,
      requestId: body.requestId,
      driverId: body.targetUserId,
      navigatorId: user.id,
    });
    this.server.to(this.roomName(body.workspaceId, body.requestId)).emit('pair.grant_control', session);
  }

  @SubscribeMessage('pair.revoke_control')
  async handleRevokeControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string },
  ) {
    this.ensureFeatureEnabled();
    await this.ensureRoomJoined(client, body.workspaceId, body.requestId);
    const session = await this.pairService.endSession(body.workspaceId, body.requestId);
    if (session) {
      this.server.to(this.roomName(body.workspaceId, body.requestId)).emit('pair.revoke_control', session);
    }
  }

  @SubscribeMessage('pair.sync_cursor')
  async handlePairCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string; cursor: unknown },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    await this.ensureRoomJoined(client, body.workspaceId, body.requestId);
    client.to(this.roomName(body.workspaceId, body.requestId)).emit('pair.sync_cursor', {
      userId: user.id,
      cursor: body.cursor,
    });
  }

  @SubscribeMessage('pair.sync_scroll')
  async handlePairScroll(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; requestId: string; position: unknown },
  ) {
    this.ensureFeatureEnabled();
    await this.ensureRoomJoined(client, body.workspaceId, body.requestId);
    const user = this.requireUser(client);
    client.to(this.roomName(body.workspaceId, body.requestId)).emit('pair.sync_scroll', {
      userId: user.id,
      position: body.position,
    });
  }

  private async ensureRoomJoined(client: Socket, workspaceId: string, requestId: string) {
    await this.auth.ensureWorkspaceAccess(this.requireUser(client).id, workspaceId);
    await this.auth.assertRequestInWorkspace(requestId, workspaceId);
    const room = this.roomName(workspaceId, requestId);
    if (!this.rooms.get(client)?.has(room)) {
      throw new WsException('Join pair session before syncing');
    }
  }

  private requireUser(client: Socket): AuthenticatedSocketUser {
    const user = client.data.user as AuthenticatedSocketUser | undefined;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private roomName(workspaceId: string, requestId: string) {
    return `pair:workspace:${workspaceId}:request:${requestId}`;
  }

  private ensureFeatureEnabled() {
    if (!this.config.features.pairDebugEnabled) {
      throw new WsException('Pair debugging disabled');
    }
  }
}
