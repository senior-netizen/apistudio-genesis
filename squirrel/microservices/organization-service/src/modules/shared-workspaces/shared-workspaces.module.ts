import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedWorkspacesController } from './shared-workspaces.controller';
import { SharedWorkspacesService } from './shared-workspaces.service';
import { SharedWorkspaceEntity } from '../../shared/entities/shared-workspace.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharedWorkspaceEntity])],
  controllers: [SharedWorkspacesController],
  providers: [SharedWorkspacesService],
  exports: [SharedWorkspacesService],
})
export class SharedWorkspacesModule {}
