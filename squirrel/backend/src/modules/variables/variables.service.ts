import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Variable } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { ListVariablesResponseDto, VariableResponseDto } from './dto/variable-response.dto';
import { MetricsService } from '../../infra/metrics/metrics.service';

type EnvironmentRecord = Prisma.EnvironmentGetPayload<{
  select: { id: true; name: true; variables: true };
}>;

type VariableOperation = 'list' | 'create_global' | 'create_environment' | 'update' | 'delete';

@Injectable()
export class VariablesService {
  private readonly logger = new Logger(VariablesService.name);

  constructor(private readonly prisma: PrismaService, private readonly metrics: MetricsService) {}

  async list(workspaceId: string, userId: string): Promise<ListVariablesResponseDto> {
    return this.executeWithMetrics('list', async () => {
      await this.ensureWorkspaceOwner(workspaceId, userId);
      const [global, environments] = await Promise.all([
        this.prisma.variable.findMany({
          where: { workspaceId, environmentId: null },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.environment.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
          include: {
            variables: {
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
      ]);

      const response: ListVariablesResponseDto = {
        global: global.map((variable) => this.toVariableResponse(variable, 'global')),
        environments: environments.map((env: EnvironmentRecord) => ({
          environmentId: env.id,
          environmentName: env.name,
          variables: env.variables.map((variable) => this.toVariableResponse(variable, 'environment')),
        })),
      };
      this.logger.log(
        JSON.stringify({
          event: 'variables.list.success',
          workspaceId,
          userId,
          globalCount: response.global.length,
          environmentCount: response.environments.length,
        }),
      );
      return response;
    });
  }

  async createGlobal(
    workspaceId: string,
    userId: string,
    dto: CreateVariableDto,
  ): Promise<VariableResponseDto> {
    return this.executeWithMetrics('create_global', async () => {
      await this.ensureWorkspaceOwner(workspaceId, userId);
      const created = await this.prisma.variable.create({
        data: {
          key: dto.key,
          value: dto.value,
          workspaceId,
          environmentId: null,
        },
      });
      this.logger.log(
        JSON.stringify({ event: 'variables.create.global', workspaceId, userId, variableId: created.id, key: created.key }),
      );
      return this.toVariableResponse(created, 'global');
    });
  }

  async createForEnvironment(
    environmentId: string,
    userId: string,
    dto: CreateVariableDto,
  ): Promise<VariableResponseDto> {
    return this.executeWithMetrics('create_environment', async () => {
      const environment = await this.ensureEnvironmentOwnership(environmentId, userId);
      const created = await this.prisma.variable.create({
        data: {
          key: dto.key,
          value: dto.value,
          environmentId,
          workspaceId: null,
        },
      });
      this.logger.log(
        JSON.stringify({
          event: 'variables.create.environment',
          environmentId,
          workspaceId: environment.workspaceId,
          userId,
          variableId: created.id,
          key: created.key,
        }),
      );
      return this.toVariableResponse(created, 'environment');
    });
  }

  async update(id: string, userId: string, dto: UpdateVariableDto): Promise<VariableResponseDto> {
    return this.executeWithMetrics('update', async () => {
      const variable = await this.getVariableForOwner(id, userId);
      const updated = await this.prisma.variable.update({
        where: { id },
        data: {
          key: dto.key ?? variable.key,
          value: dto.value ?? variable.value,
        },
      });
      this.logger.log(
        JSON.stringify({
          event: 'variables.update',
          variableId: id,
          userId,
          scope: updated.environmentId ? 'environment' : 'global',
        }),
      );
      return this.toVariableResponse(updated, updated.environmentId ? 'environment' : 'global');
    });
  }

  async delete(id: string, userId: string) {
    return this.executeWithMetrics('delete', async () => {
      const variable = await this.getVariableForOwner(id, userId);
      await this.prisma.variable.delete({ where: { id } });
      this.logger.log(
        JSON.stringify({
          event: 'variables.delete',
          variableId: id,
          userId,
          scope: variable.environmentId ? 'environment' : 'global',
        }),
      );
      return { status: 'deleted' };
    });
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

  private async ensureEnvironmentOwnership(environmentId: string, userId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
    });
    if (!environment || environment.workspace?.ownerId !== userId) {
      throw new NotFoundException({ code: 'ENVIRONMENT_NOT_FOUND', message: 'Environment not found' });
    }
    return environment;
  }

  private async getVariableForOwner(id: string, userId: string) {
    const variable = await this.prisma.variable.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        value: true,
        workspaceId: true,
        environmentId: true,
        workspace: { select: { ownerId: true } },
        environment: { select: { workspace: { select: { ownerId: true } } } },
      },
    });
    const ownerId = variable?.workspace?.ownerId ?? variable?.environment?.workspace?.ownerId;
    if (!variable || ownerId !== userId) {
      throw new NotFoundException({ code: 'VARIABLE_NOT_FOUND', message: 'Variable not found' });
    }
    return variable;
  }

  private toVariableResponse(variable: Variable, scope: 'global' | 'environment'): VariableResponseDto {
    return {
      id: variable.id,
      key: variable.key,
      value: variable.value,
      scope,
      enabled: true,
      description: undefined,
      secret: false,
    };
  }

  private async executeWithMetrics<T>(operation: VariableOperation, action: () => Promise<T>): Promise<T> {
    try {
      const result = await action();
      this.metrics.recordVariableOperation(operation, 'success');
      return result;
    } catch (error) {
      this.metrics.recordVariableOperation(operation, 'failure');
      this.logger.error(
        JSON.stringify({
          event: 'variables.operation.failed',
          operation,
          error: error instanceof Error ? error.message : 'unknown-error',
        }),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
