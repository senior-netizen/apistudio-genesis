import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';

@Injectable()
export class FounderProvisionerService implements OnModuleInit {
  private readonly logger = new Logger(FounderProvisionerService.name);
  private readonly workspaceName = 'Founder HQ';

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const email = this.normalizeEmail(this.config.get<string>('app.owner.email'));
    const password = this.config.get<string>('app.owner.password');
    if (!email || !password) {
      this.logger.debug('Founder provisioning skipped: missing OWNER_EMAIL or OWNER_PASSWORD');
      return;
    }

    try {
      const existing = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, passwordHash: true },
      });
      if (!existing) {
        await this.createFounderAccount(email, password);
        return;
      }
      await this.ensurePassword(existing.id, existing.passwordHash, password);
      await this.ensureWorkspace(existing.id);
      this.logger.debug(`Founder account already present for ${existing.email ?? email}`);
    } catch (error) {
      this.logger.error(
        `Founder provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private normalizeEmail(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private async createFounderAccount(email: string, password: string) {
    const passwordHash = await bcryptHash(password, 12);
    const displayName = 'Founder';
    this.logger.log(`Provisioning founder account for ${email}`);
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          role: 'admin',
        },
      });
      const workspaceId = await this.createWorkspaceWithClient(tx, user.id);
      await tx.auditLog.create({
        data: ({
          workspaceId,
          actorId: user.id,
          action: 'WORKSPACE_BOOTSTRAPPED',
          metadata: { source: 'founder-provisioner' },
        } as any),
      });
    });
    this.logger.log(`Founder account created for ${email}`);
  }

  private async ensurePassword(userId: string, passwordHash: string, password: string) {
    const matches = await bcryptCompare(password, passwordHash);
    if (matches) {
      return;
    }
    this.logger.warn('OWNER_PASSWORD has changed – rotating founder password hash');
    const updatedHash = await bcryptHash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: updatedHash },
    });
  }

  private async ensureWorkspace(userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (workspace) {
      await this.ensureWorkspaceMembership(workspace.id, userId);
      return workspace.id;
    }
    const workspaceId = await this.createWorkspaceWithClient(this.prisma, userId);
    await this.prisma.auditLog.create({
      data: ({
        workspaceId,
        actorId: userId,
        action: 'WORKSPACE_BOOTSTRAPPED',
        metadata: { source: 'founder-provisioner' },
      } as any),
    });
    return workspaceId;
  }

  private async ensureWorkspaceMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { id: true },
    });
    if (membership) {
      return;
    }
    await this.prisma.workspaceMember.create({
      data: ({
        workspaceId,
        userId,
        role: 'OWNER',
      } as any),
    });
  }

  private async createWorkspaceWithClient(
    client: Prisma.TransactionClient | PrismaService,
    ownerId: string,
  ): Promise<string> {
    const name = this.workspaceName;
    const slug = await this.generateWorkspaceSlug(name);
    const workspace = await client.workspace.create({
      data: ({
        name,
        slug,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      } as any),
    });
    return workspace.id;
  }

  private async generateWorkspaceSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 32) || 'founder';
    let slug = base;
    let counter = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }
}
