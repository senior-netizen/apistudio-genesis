import { OnModuleDestroy } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SyncService } from "./sync.service";
import type {
  SyncChangeBroadcast,
  SyncConflictBroadcast,
} from "./sync.service";
import type { SyncPresenceEvent } from "@sdl/sync-core";
import { AppLogger } from "../infra/logger/app-logger.service";

interface ClientSession {
  workspaceId: string;
  deviceId: string;
  userId: string;
}

@WebSocketGateway({ namespace: "/sync/ws", cors: { origin: "*" } })
export class SyncGateway implements OnModuleDestroy {
  private readonly logger;
  private readonly changeListeners = new Set<
    (payload: SyncChangeBroadcast) => void
  >();
  private readonly conflictListeners = new Set<
    (payload: SyncConflictBroadcast) => void
  >();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly sync: SyncService,
    appLogger: AppLogger,
  ) {
    this.logger = appLogger.forContext(SyncGateway.name);
    const changeListener = (payload: SyncChangeBroadcast) => {
      this.server
        ?.to(this.workspaceRoom(payload.workspaceId))
        .emit("changes.pull", {
          scopeType: payload.scopeType,
          scopeId: payload.scopeId,
          changes: payload.changes,
        });
    };
    this.changeListeners.add(changeListener);
    this.sync.onChanges(changeListener);

    const conflictListener = (payload: SyncConflictBroadcast) => {
      this.server
        ?.to(this.workspaceRoom(payload.workspaceId))
        .emit("sync.conflict", {
          scopeType: payload.scopeType,
          scopeId: payload.scopeId,
          deviceId: payload.deviceId,
          divergence: payload.divergence,
        });
    };
    this.conflictListeners.add(conflictListener);
    this.sync.onConflict(conflictListener);
  }

  onModuleDestroy() {
    for (const listener of this.changeListeners) {
      this.sync.offChanges(listener);
    }
    for (const listener of this.conflictListeners) {
      this.sync.offConflict(listener);
    }
    this.changeListeners.clear();
    this.conflictListeners.clear();
  }

  afterInit() {
    this.logger.info("Sync websocket gateway initialized");
  }

  async handleConnection(client: Socket) {
    const token = String(client.handshake.query.token ?? "");
    const workspaceId = String(client.handshake.query.workspaceId ?? "");
    if (!token || !workspaceId) {
      this.logger.warn(
        "Missing token or workspaceId in sync websocket handshake",
      );
      client.disconnect();
      return;
    }
    const session = await this.sync.verifySession(token);
    if (!session || session.workspaceId !== workspaceId) {
      this.logger.warn("Invalid sync session token");
      client.disconnect();
      return;
    }
    client.data.session = {
      workspaceId,
      deviceId: session.deviceId,
      userId: session.userId,
    } satisfies ClientSession;
    void client.join(this.workspaceRoom(workspaceId));
    this.logger.debug(
      `Sync client connected ${client.id} workspace=${workspaceId}`,
    );
    client.emit("hello", {
      deviceId: session.deviceId,
      workspaceId,
      status: "connected",
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Sync client disconnected ${client.id}`);
  }

  @SubscribeMessage("presence")
  async handlePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SyncPresenceEvent,
  ) {
    const session: ClientSession | undefined = client.data.session;
    if (!session) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }
    await this.sync.recordPresence(session.workspaceId, {
      ...body,
      deviceId: session.deviceId,
    });
    this.server.to(this.workspaceRoom(session.workspaceId)).emit("presence", {
      workspaceId: session.workspaceId,
      states: await this.sync.listPresence(session.workspaceId),
    });
  }

  private workspaceRoom(workspaceId: string) {
    return `workspace:${workspaceId}`;
  }
}
