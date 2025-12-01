import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertOwnerRoleNotAssigned, resolveAccountRole } from '../../common/security/owner-role.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: (process.env.PRISMA_LOG ?? 'error,warn')
        .split(',')
        .map((level) => level.trim())
        .filter(Boolean) as Array<'info' | 'query' | 'warn' | 'error'>,
    });

    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (params.model === 'User') {
        this.guardUserRoleWrites(params);
      }
      const result = await next(params);
      if (params.model === 'User') {
        return this.applyEffectiveOwnerRole(result);
      }
      return result;
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to connect to database: ${message}. Continuing without active connection.`);
    }
  }

  private preventOwnerRoleAssignment(data: unknown) {
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (entry && typeof entry === 'object' && 'role' in entry) {
          assertOwnerRoleNotAssigned((entry as Record<string, unknown>).role);
        }
      }
      return;
    }
    if (data && typeof data === 'object' && 'role' in data) {
      assertOwnerRoleNotAssigned((data as Record<string, unknown>).role);
    }
  }

  private guardUserRoleWrites(params: Prisma.MiddlewareParams) {
    switch (params.action) {
      case 'create':
      case 'update':
      case 'updateMany':
      case 'createMany': {
        if ('data' in params.args && params.args.data) {
          this.preventOwnerRoleAssignment(params.args.data);
        }
        break;
      }
      case 'upsert': {
        const args = params.args as { create?: unknown; update?: unknown };
        if (args.create) {
          this.preventOwnerRoleAssignment(args.create);
        }
        if (args.update) {
          this.preventOwnerRoleAssignment(args.update);
        }
        break;
      }
      default:
        break;
    }
  }

  private applyEffectiveOwnerRole(result: unknown): unknown {
    if (!result) {
      return result;
    }
    if (Array.isArray(result)) {
      return result.map((entry) => this.applyEffectiveOwnerRole(entry));
    }
    if (typeof result !== 'object') {
      return result;
    }
    const record = result as Record<string, unknown>;
    if ('role' in record) {
      const email = typeof record.email === 'string' ? record.email : undefined;
      const role = typeof record.role === 'string' ? record.role : undefined;
      record.role = resolveAccountRole(email, role);
    }
    return record;
  }
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
