import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { InfraModule } from '../../infra/infra.module';
import { MagicInvitesController } from './magic-invites.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [InfraModule, RealtimeModule],
  controllers: [WorkspacesController, MagicInvitesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
