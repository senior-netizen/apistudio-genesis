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
import { Server, Socket } from 'socket.io';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';
import { RedisService } from '../../infra/redis/redis.service';
import { configureSocketAdapter } from './utils/socket-adapter.util';
import { CollabAuthorizationService, AuthenticatedSocketUser } from './services/collab-authorization.service';
import { WorkspaceAwarenessService, WorkspacePresenceState } from './services/workspace-awareness.service';

@WebSocketGateway({ namespace: /\/collab\/.+/, cors: { origin: '*' } })
export class WorkspaceAwarenessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WorkspaceAwarenessGateway.name);
  private readonly workspaces = new WeakMap<Socket, string>();
  private readonly users = new WeakMap<Socket, AuthenticatedSocketUser>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly auth: CollabAuthorizationService,
    private readonly awareness: WorkspaceAwarenessService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; workspace awareness running without shared adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('workspace-collab:pub');
      const subClient = this.redis.duplicate('workspace-collab:sub');
      await configureSocketAdapter(this.logger, this.server, pubClient, subClient);
    } catch (error) {
      this.logger.warn(
        `Failed to configure workspace awareness adapter: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async handleConnection(client: Socket) {
    if (!this.config.features.collabEnabled) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.authenticate(client);
      this.users.set(client, user);
      const workspaceId = this.extractWorkspaceId(client.nsp?.name);
      if (!workspaceId) {
        throw new WsException('Workspace identifier missing');
      }
      await this.auth.ensureWorkspaceAccess(user.id, workspaceId);
      this.workspaces.set(client, workspaceId);
      await client.join('awareness');
      const state = await this.awareness.join(workspaceId, client.id, {
        socketId: client.id,
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cursor: null,
      });
      const members = await this.awareness.list(workspaceId);
      client.emit('presence.sync', { workspaceId, members });
      client.to('awareness').emit('presence.join', { workspaceId, member: state });
    } catch (error) {
      this.logger.debug(`Workspace awareness connection rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const workspaceId = this.workspaces.get(client);
    if (!workspaceId) {
      return;
    }
    const left = await this.awareness.leave(workspaceId, client.id);
    this.workspaces.delete(client);
    this.users.delete(client);
    if (left) {
      client.to('awareness').emit('presence.leave', { workspaceId, member: left });
    }
  }

  @SubscribeMessage('presence.update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      cursor?: WorkspacePresenceState['cursor'];
    },
  ) {
    this.ensureFeatureEnabled();
    const workspaceId = this.workspaces.get(client);
    const user = this.users.get(client);
    if (!workspaceId || !user) {
      throw new WsException('Workspace session missing');
    }
    const updated = await this.awareness.upsert(workspaceId, client.id, {
      cursor: body.cursor ?? null,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
    });
    client.nsp.emit('presence.update', { workspaceId, member: updated });
  }

  private extractWorkspaceId(namespace?: string | null): string | null {
    if (!namespace) {
      return null;
    }
    const segments = namespace.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    return segments[1] ?? null;
  }

  private ensureFeatureEnabled() {
    if (!this.config.features.collabEnabled) {
      throw new WsException('Collaboration disabled');
    }
  }
}
