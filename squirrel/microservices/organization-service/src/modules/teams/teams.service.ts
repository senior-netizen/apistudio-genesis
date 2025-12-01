import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamEntity } from '../../shared/entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepository: Repository<TeamEntity>,
    private readonly redisService: RedisService,
  ) {}

  createTeam(organizationId: string, dto: CreateTeamDto) {
    const team = this.teamRepository.create({
      organizationId,
      name: dto.name,
    });
    return this.teamRepository.save(team).then((saved) => {
      void this.redisService.publish('logs.internal', {
        type: 'team.created',
        organizationId,
        teamId: saved.id,
        name: saved.name,
      });
      return saved;
    });
  }

  listForOrganization(organizationId: string) {
    return this.teamRepository.find({ where: { organizationId } });
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto) {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }
    Object.assign(team, dto);
    const saved = await this.teamRepository.save(team);
    await this.redisService.publish('logs.internal', {
      type: 'team.updated',
      organizationId: saved.organizationId,
      teamId: saved.id,
    });
    return saved;
  }
}
