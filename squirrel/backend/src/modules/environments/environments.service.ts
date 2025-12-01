import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, userId: string) {
    await this.ensureWorkspaceOwner(workspaceId, userId);
    return this.prisma.environment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, userId: string, dto: CreateEnvironmentDto) {
    await this.ensureWorkspaceOwner(workspaceId, userId);
    const environment = await this.prisma.environment.create({
      data: {
        name: dto.name,
        workspaceId,
      },
    });
    return environment;
  }

  async update(id: string, userId: string, dto: UpdateEnvironmentDto) {
    const environment = await this.getEnvironmentForOwner(id, userId);
    const updated = await this.prisma.environment.update({
      where: { id },
      data: {
        name: dto.name ?? environment.name,
      },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.getEnvironmentForOwner(id, userId);
    await this.prisma.environment.delete({ where: { id } });
    return { status: 'deleted' };
  }

  private async ensureWorkspaceOwner(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    }
  }

  private async getEnvironmentForOwner(id: string, userId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!environment || environment.workspace?.ownerId !== userId) {
      throw new NotFoundException({ code: 'ENVIRONMENT_NOT_FOUND', message: 'Environment not found' });
    }
    return environment;
  }
}
