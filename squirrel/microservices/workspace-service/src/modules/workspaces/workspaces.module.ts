import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { Project } from './entities/project.entity';
import { Collection } from './entities/collection.entity';
import { Request } from './entities/request.entity';
import { Environment } from './entities/environment.entity';
import { Mock } from './entities/mock.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Project, Collection, Request, Environment, Mock, User]),
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule { }
