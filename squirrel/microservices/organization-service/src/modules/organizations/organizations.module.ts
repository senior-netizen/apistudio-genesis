import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationEntity } from '../../shared/entities/organization.entity';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, OrganizationMemberEntity])],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
