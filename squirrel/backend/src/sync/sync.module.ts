import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncGateway } from './sync.gateway';

@Module({
  imports: [InfraModule],
  providers: [SyncService, SyncGateway],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
