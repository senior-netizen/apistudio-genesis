import { Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '../../infra/redis/redis.service';
import appConfig from '../../config/configuration';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly redis: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async afterInit() {
    if (!this.config.redis.enabled) {
      this.logger.warn('Redis disabled; running without Socket.io Redis adapter');
      return;
    }
    try {
      const pubClient = this.redis.duplicate('ws:pub');
      const subClient = this.redis.duplicate('ws:sub');
      const adapterFactory = createAdapter(pubClient, subClient);
      const target = this.resolveAdapterTarget();
      if (target) {
        target.adapter(adapterFactory);
        this.logger.log('Realtime gateway initialized with Redis adapter');
      } else {
        this.logger.warn('Socket.io adapter method not available; skipping Redis adapter configuration');
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis adapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private resolveAdapterTarget(): { adapter: (factory: ReturnType<typeof createAdapter>) => void } | null {
    const namespace = this.server as unknown;
    if (RealtimeGateway.isAdapterCapable(namespace)) {
      return namespace;
    }
    if (
      namespace &&
      typeof namespace === 'object' &&
      'server' in (namespace as { server?: unknown }) &&
      RealtimeGateway.isAdapterCapable((namespace as { server?: unknown }).server)
    ) {
      return (namespace as { server?: unknown }).server as {
        adapter: (factory: ReturnType<typeof createAdapter>) => void;
      };
    }
    return null;
  }

  private static isAdapterCapable(
    value: unknown,
  ): value is { adapter: (factory: ReturnType<typeof createAdapter>) => void } {
    return typeof value === 'object' && value !== null && typeof (value as { adapter?: unknown }).adapter === 'function';
  }

  handleConnection(socket: Socket) {
    this.logger.debug(`Client connected ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Client disconnected ${socket.id}`);
  }

  @SubscribeMessage('presence.join')
  async handlePresence(@ConnectedSocket() socket: Socket, @MessageBody() body: { workspaceId: string }) {
    if (!body?.workspaceId) return;
    await socket.join(`workspace:${body.workspaceId}`);
    this.server.to(`workspace:${body.workspaceId}`).emit('presence.sync', {
      workspaceId: body.workspaceId,
      members: Array.from(this.server.sockets.adapter.rooms.get(`workspace:${body.workspaceId}`) ?? []),
    });
  }

  broadcastRunProgress(workspaceId: string, payload: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('run.progress', payload);
  }
}
