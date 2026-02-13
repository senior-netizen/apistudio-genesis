import { Injectable } from "@nestjs/common";
import { SyncService } from "../../sync/sync.service";
import { SyncHandshakeDto } from "../../sync/dto/handshake.dto";
import { SyncPullDto } from "../../sync/dto/pull.dto";
import { SyncPushDto } from "../../sync/dto/push.dto";

@Injectable()
export class SyncDomainService {
  constructor(private readonly sync: SyncService) {}

  async openSession(user: { id: string }, dto: SyncHandshakeDto) {
    return this.sync.handshake(user, dto);
  }

  async pullChanges(user: { id: string }, dto: SyncPullDto) {
    return this.sync.pull(user, dto);
  }

  async pushChanges(user: { id: string }, dto: SyncPushDto) {
    return this.sync.push(user, dto);
  }

  async listPresence(workspaceId: string) {
    return this.sync.listPresence(workspaceId);
  }
}
