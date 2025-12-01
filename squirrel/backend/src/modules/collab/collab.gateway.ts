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
import { Buffer } from 'node:buffer';
import appConfig from '../../config/configuration';
import { RedisService } from '../../infra/redis/redis.service';
import { configureSocketAdapter } from './utils/socket-adapter.util';
import { CollabAuthorizationService, AuthenticatedSocketUser } from './services/collab-authorization.service';
import { CollabPresenceService } from './services/collab-presence.service';
import { YjsService } from './services/yjs.service';
import type { PresenceState } from './types';

@WebSocketGateway({ namespace: '/collab', cors: { origin: '*' } })
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollabGateway.name);
  private readonly contexts = new WeakMap<Socket, Map<string, DocumentContext>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly auth: CollabAuthorizationService,
    private readonly presence: CollabPresenceService,
    private readonly yjs: YjsService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.yjs.onRemoteUpdate((roomId, update, actorId) => {
      const payload = Buffer.from(update).toString('base64');
      this.server.to(roomId).emit('yjs.update', { roomId, update: payload, actorId });
    });
  }

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; collaboration namespace running without shared adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('collab:pub');
      const subClient = this.redis.duplicate('collab:sub');
      await configureSocketAdapter(this.logger, this.server, pubClient, subClient);
    } catch (error) {
      this.logger.warn(`Failed to configure Socket.io Redis adapter: ${error instanceof Error ? error.message : error}`);
    }
  }

  async handleConnection(client: Socket) {
    if (!this.config.features.collabEnabled) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.auth.authenticate(client);
      client.data.user = user;
      this.contexts.set(client, new Map());
    } catch (error) {
      this.logger.debug(`Collab socket rejected: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const docs = this.contexts.get(client);
    if (!docs) return;
    await Promise.all(
      Array.from(docs.values()).map(async (context) => {
        await this.cleanupPresence(client, context, true);
      }),
    );
    this.contexts.delete(client);
  }

  @SubscribeMessage('presence.join')
  async handlePresenceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { workspaceId: string; docId?: string; requestId?: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const workspaceId = body.workspaceId;
    const docId = body.docId ?? body.requestId ?? 'default';
    const requestId = body.requestId ?? docId;
    const membership = await this.auth.ensureWorkspaceAccess(user.id, workspaceId);
    if (body.requestId) {
      await this.auth.assertRequestInWorkspace(body.requestId, workspaceId);
    }

    const roomId = this.roomId(workspaceId, requestId);
    const context: DocumentContext = { workspaceId, docId, requestId, roomId };
    this.getContextMap(client).set(roomId, context);
    await this.yjs.ensureRoom(roomId, workspaceId, docId, requestId);
    await client.join(roomId);
    const basePresence: PresenceState = {
      socketId: client.id,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      role: membership.role,
      status: 'active',
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const presenceState = await this.presence.join(workspaceId, docId, client.id, basePresence);
    const members = await this.presence.list(workspaceId, docId);
    client.emit('presence.sync', { workspaceId, docId, members });
    client.to(roomId).emit('presence.join', { workspaceId, docId, member: presenceState });

    const encoded = await this.yjs.getStateVector(roomId, workspaceId, docId, requestId);
    client.emit('yjs.sync', { roomId, update: encoded });
    const awareness = await this.yjs.getAwareness(roomId);
    if (Object.keys(awareness).length > 0) {
      client.emit('cursor.sync', { roomId, states: awareness });
    }
  }

  @SubscribeMessage('presence.update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { workspaceId: string; docId?: string; requestId?: string; status?: PresenceState['status']; typing?: boolean },
  ) {
    this.ensureFeatureEnabled();
    const { roomId, docId, workspaceId } = this.resolveContext(client, body.workspaceId, body.docId ?? body.requestId);
    const updated = await this.presence.upsert(workspaceId, docId, client.id, {
      status: body.status,
      typing: body.typing,
    });
    this.server.to(roomId).emit('presence.update', { workspaceId, docId, member: updated });
  }

  @SubscribeMessage('presence.leave')
  async handlePresenceLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId: string; docId?: string; requestId?: string },
  ) {
    this.ensureFeatureEnabled();
    const context = this.resolveContext(client, body.workspaceId, body.docId ?? body.requestId);
    await this.cleanupPresence(client, context, false);
  }

  @SubscribeMessage('cursor.update')
  async handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      workspaceId: string;
      docId?: string;
      requestId?: string;
      cursor: { position: number; selection?: { start: number; end: number }; color?: string };
    },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const { roomId, docId, workspaceId } = this.resolveContext(client, body.workspaceId, body.docId ?? body.requestId);
    await this.presence.upsert(workspaceId, docId, client.id, { cursor: body.cursor });
    await this.yjs.updateAwareness(roomId, client.id, { ...body.cursor, userId: user.id });
    client.to(roomId).emit('cursor.update', {
      workspaceId,
      docId,
      socketId: client.id,
      userId: user.id,
      cursor: body.cursor,
    });
  }

  @SubscribeMessage('yjs.update')
  async handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { workspaceId: string; docId?: string; requestId?: string; update: string },
  ) {
    this.ensureFeatureEnabled();
    const user = this.requireUser(client);
    const { roomId, docId, workspaceId, requestId } = this.resolveContext(client, body.workspaceId, body.docId ?? body.requestId);
    const update = Buffer.from(body.update, 'base64');
    await this.yjs.applyUpdate({
      roomId,
      workspaceId,
      docId,
      requestId,
      update,
      actorId: user.id,
    });
    client.to(roomId).emit('yjs.update', { roomId, update: body.update, actorId: user.id });
  }

  private async cleanupPresence(client: Socket, context: DocumentContext, silent: boolean) {
    await this.presence.leave(context.workspaceId, context.docId, client.id);
    await this.yjs.removeAwareness(context.roomId, client.id);
    if (!silent) {
      this.server.to(context.roomId).emit('presence.leave', {
        workspaceId: context.workspaceId,
        docId: context.docId,
        socketId: client.id,
      });
    }
    client.leave(context.roomId);
    this.getContextMap(client).delete(context.roomId);
  }

  private requireUser(client: Socket): AuthenticatedSocketUser {
    const user = client.data.user as AuthenticatedSocketUser | undefined;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private getContextMap(client: Socket): Map<string, DocumentContext> {
    let map = this.contexts.get(client);
    if (!map) {
      map = new Map();
      this.contexts.set(client, map);
    }
    return map;
  }

  private resolveContext(client: Socket, workspaceId: string, docId?: string) {
    if (!workspaceId) {
      throw new WsException('Workspace identifier required');
    }
    const targetDocId = docId ?? 'default';
    const requestId = docId ?? targetDocId;
    const roomId = this.roomId(workspaceId, requestId);
    const context = this.getContextMap(client).get(roomId);
    if (!context) {
      throw new WsException('Join the document before publishing updates');
    }
    return context;
  }

  private roomId(workspaceId: string, requestId: string) {
    return `yjs:workspace:${workspaceId}:request:${requestId}`;
  }

  private ensureFeatureEnabled() {
    if (!this.config.features.collabEnabled) {
      throw new WsException('Collaboration disabled');
    }
  }
}

type DocumentContext = {
  workspaceId: string;
  docId: string;
  requestId: string;
  roomId: string;
};
