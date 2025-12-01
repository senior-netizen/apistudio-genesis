import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { OrganizationInviteEntity } from '../../shared/entities/organization-invite.entity';
import { OrganizationMemberEntity } from '../../shared/entities/organization-member.entity';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RedisService } from '../../config/redis.service';
import { OrganizationRole } from '../../shared/constants/organization-roles';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(OrganizationInviteEntity)
    private readonly inviteRepository: Repository<OrganizationInviteEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepository: Repository<OrganizationMemberEntity>,
    private readonly redisService: RedisService,
  ) {}

  async createInvite(organizationId: string, dto: CreateInviteDto, invitedByUserId: string) {
    const token = uuid();
    const invite = this.inviteRepository.create({
      organizationId,
      email: dto.email,
      role: dto.role ?? OrganizationRole.MEMBER,
      invitedByUserId,
      token,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const saved = await this.inviteRepository.save(invite);
    await this.redisService.publish(`organization:${organizationId}:events`, {
      type: 'org.invite.sent',
      invite: saved,
    });
    await this.redisService.publish('logs.internal', {
      type: 'invite.sent',
      organizationId,
      inviteId: saved.id,
      email: saved.email,
      role: saved.role,
    });
    return saved;
  }

  getInviteByToken(token: string) {
    return this.inviteRepository.findOne({ where: { token } });
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.inviteRepository.findOne({ where: { token: dto.token } });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }
    if (invite.status !== 'pending') {
      throw new BadRequestException('Invitation already processed');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation expired');
    }

    const member = this.memberRepository.create({
      organizationId: invite.organizationId,
      userId: dto.userId,
      role: invite.role,
    });
    await this.memberRepository.save(member);
    invite.status = 'accepted';
    await this.inviteRepository.save(invite);

    await this.redisService.publish(`organization:${invite.organizationId}:events`, {
      type: 'org.invite.accepted',
      invite,
    });
    await this.redisService.publish('logs.internal', {
      type: 'invite.accepted',
      organizationId: invite.organizationId,
      inviteId: invite.id,
      userId: dto.userId,
    });
    return member;
  }
}
