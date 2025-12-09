import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import bcrypt = require('bcryptjs');
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminApiKeyType, WorkspaceRole } from '../../infra/prisma/enums';
import { CreateAdminApiKeyDto } from './dto/create-admin-api-key.dto';
import { RotateAdminApiKeyDto } from './dto/rotate-admin-api-key.dto';
import { EmergencyRotationDto } from './dto/emergency-rotation.dto';

const KEY_PREFIX = 'api_';

type RotationScope = {
  scope: 'all' | 'workspace' | 'org' | 'region';
  workspaceId?: string;
  orgId?: string;
  regionCode?: string;
};

type SerializedKeyState = {
  id: string;
  keyId: string;
  keyPrefix: string;
  secretHash: string;
  scopes: string[];
  type: AdminApiKeyType;
  description?: string | null;
  createdById: string;
  workspaceId?: string | null;
  expiresAt?: string | null;
  ipRestrictions: string[];
  revoked: boolean;
  revokedAt?: string | null;
  rotatedAt?: string | null;
};

@Injectable()
export class SecurityCenterService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

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
    const hash = (bcrypt as any).hashSync(secret, 10);
    return { keyId: prefix, keyPrefix: prefix.slice(0, 12), secret, hash } as const;
  }

  private assertRootMode() {
    if (!this.config.get<boolean>('app.features.rootModeEnabled')) {
      throw new ForbiddenException('Root Mode required for this operation');
    }
  }

  private serializeKey(key: any): SerializedKeyState {
    return {
      id: key.id,
      keyId: key.keyId,
      keyPrefix: key.keyPrefix,
      secretHash: key.secretHash,
      scopes: key.scopes,
      type: key.type,
      description: key.description,
      createdById: key.createdById,
      workspaceId: key.workspaceId,
      expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
      ipRestrictions: key.ipRestrictions ?? [],
      revoked: key.revoked,
      revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
      rotatedAt: key.rotatedAt ? key.rotatedAt.toISOString() : null,
    };
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

  private async rotateKeysForScope(
    user: { id: string; role?: string },
    where: any,
    scope: RotationScope,
    dto: EmergencyRotationDto,
  ) {
    const keys = await this.prisma.adminApiKey.findMany({ where: { revoked: false, ...where } });
    if (!keys.length) {
      return { batchId: null, rotated: 0, newKeys: [] as any[] };
    }

    const now = new Date();
    const dualMode = (dto.dualModeMinutes ?? 0) > 0;
    const graceUntil = dualMode ? new Date(now.getTime() + (dto.dualModeMinutes ?? 0) * 60_000) : null;
    const revokeOld = dto.revokeOldImmediately !== false;

    const beforeStates = keys.map((k: any) => this.serializeKey(k));
    const newKeys: { id: string; keyId: string; secret: string; workspaceId?: string | null }[] = [];
    const afterStates: SerializedKeyState[] = [];

    let batchId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      for (const key of keys) {
        const { keyId, keyPrefix, secret, hash } = this.generateKeyMaterial();
        const created = await tx.adminApiKey.create({
          data: {
            keyId,
            keyPrefix,
            secretHash: hash,
            scopes: key.scopes,
            type: key.type,
            description: key.description,
            createdById: user.id,
            workspaceId: key.workspaceId,
            expiresAt: key.expiresAt,
            ipRestrictions: key.ipRestrictions,
          },
        });

        newKeys.push({ id: created.id, keyId, secret, workspaceId: created.workspaceId });
        afterStates.push(this.serializeKey(created));

        const updateData: any = { rotatedAt: now };
        if (revokeOld && !dualMode) {
          updateData.revoked = true;
          updateData.revokedAt = now;
        }
        if (revokeOld && dualMode) {
          updateData.revokedAt = graceUntil;
        }

        await tx.adminApiKey.update({ where: { id: key.id }, data: updateData });

        if (key.workspaceId) {
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'admin.api_key_rotated',
              targetId: key.id,
              workspaceId: key.workspaceId,
              metadata: { scopes: key.scopes, type: key.type, reason: dto.reason },
            },
          });

          if (revokeOld) {
            await tx.auditLog.create({
              data: {
                actorId: user.id,
                action: 'admin.api_key_revoked',
                targetId: key.id,
                workspaceId: key.workspaceId,
                metadata: { rotatedAt: now, graceUntil },
              },
            });
          }

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'admin.incident_key_rotation_triggered',
              targetId: key.id,
              workspaceId: key.workspaceId,
              metadata: {
                scope: scope.scope,
                orgId: scope.orgId,
                regionCode: scope.regionCode,
                reason: dto.reason,
                impactedSystems: dto.impactedSystems,
              },
            },
          });
        }
      }

      const batch = await tx.rotationBatch.create({
        data: {
          scope: scope.scope,
          reason: dto.reason,
          triggeredBy: user.id,
          workspaceId: scope.workspaceId,
          orgId: scope.orgId,
          regionCode: scope.regionCode,
          keysBefore: beforeStates,
          keysAfter: afterStates,
        },
      });

      batchId = batch.id;
    });

    if (keys.some((k: any) => k.workspaceId)) {
      const workspaceIds = [...new Set(keys.map((k: any) => k.workspaceId).filter(Boolean) as string[])];
      await Promise.all(
        workspaceIds.map((workspaceId) =>
          this.prisma.securityEvent.create({
            data: {
              actorId: user.id,
              eventType: 'security.key_rotation_complete',
              workspaceId,
              description: dto.reason ?? 'emergency rotation',
              regionCode: scope.regionCode,
            },
          }),
        ),
      );
    }

    return { batchId, rotated: newKeys.length, newKeys, gracePeriodMinutes: dto.dualModeMinutes ?? 0 };
  }

  async rotateAll(user: { id: string; role?: string }, dto: EmergencyRotationDto) {
    this.assertRootMode();
    return this.rotateKeysForScope(user, {}, { scope: 'all' }, dto);
  }

  async rotateWorkspace(user: { id: string; role?: string }, workspaceId: string, dto: EmergencyRotationDto) {
    await this.assertWorkspaceAdmin(workspaceId, user.id);
    return this.rotateKeysForScope(user, { workspaceId }, { scope: 'workspace', workspaceId }, dto);
  }

  async rotateOrg(user: { id: string; role?: string }, orgId: string, dto: EmergencyRotationDto) {
    if (!orgId) {
      throw new BadRequestException('orgId required');
    }
    const workspaces = await this.prisma.workspace.findMany({ where: { ownerId: orgId } });
    const workspaceIds = workspaces.map((w) => w.id);
    if (!workspaceIds.length) {
      return { batchId: null, rotated: 0, newKeys: [] };
    }
    return this.rotateKeysForScope(user, { workspaceId: { in: workspaceIds } }, { scope: 'org', orgId }, dto);
  }

  async rotateRegion(user: { id: string; role?: string }, regionCode: string, dto: EmergencyRotationDto) {
    if (!regionCode) {
      throw new BadRequestException('regionCode required');
    }
    const workspaceIds = (
      await this.prisma.workspace.findMany({
        where: { regionCode } as Prisma.WorkspaceWhereInput,
        select: { id: true },
      })
    ).map((w) => w.id);
    if (!workspaceIds.length) {
      return { batchId: null, rotated: 0, newKeys: [] };
    }
    return this.rotateKeysForScope(
      user,
      { workspaceId: { in: workspaceIds } },
      { scope: 'region', regionCode },
      dto,
    );
  }

  async rollback(user: { id: string }, batchId: string) {
    const batch = await this.prisma.rotationBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return null;
    }

    const keysBefore = (batch.keysBefore as SerializedKeyState[]) ?? [];
    const keysAfter = (batch.keysAfter as SerializedKeyState[]) ?? [];

    await this.prisma.$transaction(async (tx) => {
      for (const rotated of keysAfter) {
        await tx.adminApiKey.update({
          where: { id: rotated.id },
          data: { revoked: true, revokedAt: new Date(), rotatedAt: new Date() },
        });
      }

      for (const prior of keysBefore) {
        await tx.adminApiKey.update({
          where: { id: prior.id },
          data: {
            revoked: prior.revoked,
            revokedAt: prior.revokedAt ? new Date(prior.revokedAt) : null,
            rotatedAt: prior.rotatedAt ? new Date(prior.rotatedAt) : null,
            scopes: prior.scopes,
            type: prior.type,
            description: prior.description ?? undefined,
            expiresAt: prior.expiresAt ? new Date(prior.expiresAt) : null,
            ipRestrictions: prior.ipRestrictions,
          },
        });

        if (prior.workspaceId) {
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'admin.key_rotation_rolled_back',
              targetId: prior.id,
              workspaceId: prior.workspaceId,
              metadata: { scope: batch.scope, reason: batch.reason },
            },
          });
        }
      }

      await tx.rotationBatch.update({ where: { id: batch.id }, data: { rolledBackAt: new Date(), completed: false } });
    });

    return { batchId, rolledBack: keysBefore.length };
  }
}
