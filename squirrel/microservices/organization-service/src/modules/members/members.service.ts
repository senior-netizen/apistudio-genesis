import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepository: Repository<OrganizationMemberEntity>,
    private readonly redisService: RedisService,
  ) {}

  addMember(organizationId: string, dto: AddMemberDto) {
    const member = this.memberRepository.create({
      organizationId,
      userId: dto.userId,
      role: dto.role,
    });
    return this.memberRepository.save(member).then((saved) => {
      void this.redisService.publish('logs.internal', {
        type: 'member.joined',
        organizationId,
        userId: saved.userId,
        role: saved.role,
      });
      return saved;
    });
  }

  listMembers(organizationId: string) {
    return this.memberRepository.find({ where: { organizationId } });
  }

  async updateMemberRole(memberId: string, dto: UpdateMemberRoleDto) {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    member.role = dto.role;
    const saved = await this.memberRepository.save(member);
    await this.redisService.publish('logs.internal', {
      type: 'member.role_changed',
      organizationId: saved.organizationId,
      userId: saved.userId,
      role: saved.role,
    });
    return saved;
  }

  async removeMember(memberId: string) {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    await this.memberRepository.delete(memberId);
    await this.redisService.publish('logs.internal', {
      type: 'member.removed',
      organizationId: member.organizationId,
      userId: member.userId,
    });
    return member;
  }
}
