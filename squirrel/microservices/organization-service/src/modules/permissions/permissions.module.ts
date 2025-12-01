import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMemberEntity])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
