import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedWorkspaceEntity } from '../../shared/entities/shared-workspace.entity';
import { ShareWorkspaceDto } from './dto/share-workspace.dto';
import { UpdateWorkspacePermissionDto } from './dto/update-workspace-permission.dto';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class SharedWorkspacesService {
  constructor(
    @InjectRepository(SharedWorkspaceEntity)
    private readonly sharedWorkspaceRepository: Repository<SharedWorkspaceEntity>,
    private readonly redisService: RedisService,
  ) {}

  async shareWorkspace(organizationId: string, dto: ShareWorkspaceDto) {
    const existing = await this.sharedWorkspaceRepository.findOne({
      where: { organizationId, workspaceId: dto.workspaceId },
    });
    if (existing) {
      existing.permission = dto.permission;
      const updated = await this.sharedWorkspaceRepository.save(existing);
      await this.redisService.publish(`organization:${organizationId}:events`, {
        type: 'org.workspace.update',
        workspace: updated,
      });
      await this.redisService.publish('logs.internal', {
        type: 'workspace.shared',
        organizationId,
        workspaceId: updated.workspaceId,
        permission: updated.permission,
      });
      return updated;
    }
    const record = this.sharedWorkspaceRepository.create({
      organizationId,
      workspaceId: dto.workspaceId,
      permission: dto.permission,
    });
    const saved = await this.sharedWorkspaceRepository.save(record);
    await this.redisService.publish(`organization:${organizationId}:events`, {
      type: 'org.workspace.update',
      workspace: saved,
    });
    await this.redisService.publish('logs.internal', {
      type: 'workspace.shared',
      organizationId,
      workspaceId: saved.workspaceId,
      permission: saved.permission,
    });
    return saved;
  }

  listSharedWorkspaces(organizationId: string) {
    return this.sharedWorkspaceRepository.find({ where: { organizationId } });
  }

  async updatePermission(organizationId: string, workspaceId: string, dto: UpdateWorkspacePermissionDto) {
    const record = await this.sharedWorkspaceRepository.findOne({
      where: { organizationId, workspaceId },
    });
    if (!record) {
      throw new NotFoundException('Shared workspace not found');
    }
    record.permission = dto.permission;
    const saved = await this.sharedWorkspaceRepository.save(record);
    await this.redisService.publish(`organization:${organizationId}:events`, {
      type: 'org.workspace.update',
      workspace: saved,
    });
    await this.redisService.publish('logs.internal', {
      type: 'workspace.permission_changed',
      organizationId,
      workspaceId,
      permission: saved.permission,
    });
    return saved;
  }
}
