import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminApiKeyType, WorkspaceRole } from '../../infra/prisma/enums';
import { CreateAdminApiKeyDto } from './dto/create-admin-api-key.dto';
import { RotateAdminApiKeyDto } from './dto/rotate-admin-api-key.dto';

const KEY_PREFIX = 'api_';

@Injectable()
export class SecurityCenterService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkspaceAdmin(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, role: { in: [WorkspaceRole.ADMIN, WorkspaceRole.OWNER] } },
    });
    if (!membership) {
      throw new UnauthorizedException('Admin access to workspace required');
    }
  }

  private generateKeyMaterial() {
    const prefix = KEY_PREFIX + randomBytes(8).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    const hash = bcrypt.hashSync(secret, 10);
    return { keyId: prefix, keyPrefix: prefix.slice(0, 12), secret, hash } as const;
  }

  async create(user: { id: string; role?: string }, dto: CreateAdminApiKeyDto) {
    const type = dto.type ?? AdminApiKeyType.WORKSPACE;
    if (type === AdminApiKeyType.WORKSPACE && !dto.workspaceId) {
      throw new UnauthorizedException('workspaceId required for workspace keys');
    }
    if (type === AdminApiKeyType.SYSTEM && user.role !== 'admin' && user.role !== 'founder') {
      throw new UnauthorizedException('System keys require elevated account role');
    }
    if (dto.workspaceId) {
      await this.assertWorkspaceAdmin(dto.workspaceId, user.id);
    }

    const { keyId, keyPrefix, secret, hash } = this.generateKeyMaterial();

    const key = await this.prisma.adminApiKey.create({
      data: {
        keyId,
        keyPrefix,
        secretHash: hash,
        scopes: dto.scopes ?? [],
        type,
        description: dto.description,
        createdById: user.id,
        workspaceId: dto.workspaceId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        ipRestrictions: dto.ipRestrictions ?? [],
      },
    });

    if (key.workspaceId) {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'admin.api_key_created',
          targetId: key.id,
          workspaceId: key.workspaceId,
          metadata: { scopes: key.scopes, type: key.type, description: key.description },
        },
      });
    }

    return { keyId, secret, expiresAt: key.expiresAt, scopes: key.scopes, type: key.type } as const;
  }

  async list(user: { id: string; role?: string }, workspaceId?: string) {
    if (workspaceId) {
      await this.assertWorkspaceAdmin(workspaceId, user.id);
    }

    return this.prisma.adminApiKey.findMany({
      where: {
        revoked: false,
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        keyId: true,
        keyPrefix: true,
        scopes: true,
        type: true,
        description: true,
        workspaceId: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        ipRestrictions: true,
        createdById: true,
      },
    });
  }

  async revoke(user: { id: string }, id: string) {
    const existing = await this.prisma.adminApiKey.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    if (existing.workspaceId) {
      await this.assertWorkspaceAdmin(existing.workspaceId, user.id);
    }

    const updated = await this.prisma.adminApiKey.update({
      where: { id },
      data: { revoked: true, revokedAt: new Date() },
    });

    if (updated.workspaceId) {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'admin.api_key_deleted',
          targetId: updated.id,
          workspaceId: updated.workspaceId,
          metadata: { scopes: updated.scopes, type: updated.type },
        },
      });
    }

    return { id: updated.id, revoked: true };
  }

  async rotate(user: { id: string }, id: string, dto: RotateAdminApiKeyDto) {
    const existing = await this.prisma.adminApiKey.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    if (existing.workspaceId) {
      await this.assertWorkspaceAdmin(existing.workspaceId, user.id);
    }

    const { keyId, keyPrefix, secret, hash } = this.generateKeyMaterial();

    const updated = await this.prisma.adminApiKey.update({
      where: { id },
      data: {
        keyId,
        keyPrefix,
        secretHash: hash,
        rotatedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt,
        scopes: dto.scopes ?? existing.scopes,
        ipRestrictions: dto.ipRestrictions ?? existing.ipRestrictions,
        description: dto.description ?? existing.description,
      },
    });

    if (updated.workspaceId) {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'admin.api_key_rotated',
          targetId: updated.id,
          workspaceId: updated.workspaceId,
          metadata: { scopes: updated.scopes, type: updated.type },
        },
      });
    }

    return { keyId, secret, expiresAt: updated.expiresAt, scopes: updated.scopes, type: updated.type } as const;
  }
}
