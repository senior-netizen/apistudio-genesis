import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { OrganizationInviteEntity } from '../../shared/entities/organization-invite.entity';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationInviteEntity, OrganizationMemberEntity])],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
