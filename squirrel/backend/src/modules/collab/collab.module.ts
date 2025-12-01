import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CollabGateway } from './collab.gateway';
import { CollabController } from './collab.controller';
import { LogsGateway } from './logs.gateway';
import { PairGateway } from './pair.gateway';
import { CollabAuthorizationService } from './services/collab-authorization.service';
import { CollabPresenceService } from './services/collab-presence.service';
import { YjsService } from './services/yjs.service';
import { CollabLogsService } from './services/logs.service';
import { PairService } from './services/pair.service';
import { WorkspaceAwarenessService } from './services/workspace-awareness.service';
import { WorkspaceAwarenessGateway } from './workspace-awareness.gateway';
import { CollaborationDataService } from './services/collaboration-data.service';

@Module({
  imports: [AuthModule],
  providers: [
    CollabGateway,
    LogsGateway,
    PairGateway,
    CollabAuthorizationService,
    CollabPresenceService,
    YjsService,
    CollabLogsService,
    PairService,
    WorkspaceAwarenessService,
    WorkspaceAwarenessGateway,
    CollaborationDataService,
  ],
  controllers: [CollabController],
  exports: [CollabAuthorizationService],
})
export class CollabModule {}
