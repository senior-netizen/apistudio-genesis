import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationEntity } from '../../shared/entities/organization.entity';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRole } from '../../shared/constants/organization-roles';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly organizationMemberRepository: Repository<OrganizationMemberEntity>,
    private readonly redisService: RedisService,
  ) {}

  async createOrganization(dto: CreateOrganizationDto, ownerUserId: string) {
    const organization = this.organizationRepository.create({
      name: dto.name,
      ownerUserId,
    });
    const saved = await this.organizationRepository.save(organization);

    const ownerMember = this.organizationMemberRepository.create({
      organizationId: saved.id,
      userId: ownerUserId,
      role: OrganizationRole.OWNER,
    });
    await this.organizationMemberRepository.save(ownerMember);
    await this.redisService.publish('logs.internal', {
      type: 'organization.created',
      organizationId: saved.id,
      name: saved.name,
      ownerUserId,
    });
    return saved;
  }

  findById(id: string) {
    return this.organizationRepository.findOne({
      where: { id },
      relations: ['teams', 'members', 'sharedWorkspaces'],
    });
  }

  findAll() {
    return this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    await this.organizationRepository.update(id, dto);
    await this.redisService.publish('logs.internal', {
      type: 'organization.updated',
      organizationId: id,
      changes: dto,
    });
    return this.findById(id);
  }

  async listForUser(userId: string) {
    const memberships = await this.organizationMemberRepository.find({
      where: { userId },
    });
    if (!memberships.length) {
      return [];
    }
    const ids = memberships.map((membership) => membership.organizationId);
    return this.organizationRepository.find({ where: { id: In(ids) } });
  }
}
