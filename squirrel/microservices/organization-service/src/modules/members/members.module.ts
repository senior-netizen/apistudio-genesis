import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMemberEntity])],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
