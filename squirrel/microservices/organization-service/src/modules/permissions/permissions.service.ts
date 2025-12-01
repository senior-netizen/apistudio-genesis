import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';
import { OrganizationRole } from '../../shared/constants/organization-roles';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepository: Repository<OrganizationMemberEntity>,
  ) {}

  async assertUserRole(organizationId: string, userId: string, roles: OrganizationRole[]) {
    const membership = await this.memberRepository.findOne({
      where: { organizationId, userId },
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException('Missing required organization role');
    }
    return membership;
  }

  async listUserRoles(userId: string) {
    const memberships = await this.memberRepository.find({ where: { userId } });
    return memberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
    }));
  }

  async listMembersWithRoles(organizationId: string, roles?: OrganizationRole[]) {
    const where = roles?.length ? { organizationId, role: In(roles) } : { organizationId };
    return this.memberRepository.find({ where });
  }
}
