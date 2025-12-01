import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../config/redis.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly organizationsByUser = new Map<
    string,
    { id: string; name: string; role: 'owner' | 'admin' | 'member' | 'viewer' }[]
  >();
  private readonly activeOrganization = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('user.created', (message) => {
      this.logger.log(`Received user.created event: ${message}`);
    });
    this.redisService.subscribe('billing.plan.changed', (message) => {
      this.logger.log(`Received billing.plan.changed event: ${message}`);
    });
  }

  async getProfile(id: string) {
    this.logger.log(`Fetching profile for user ${id}`);
    const organizations = await this.listOrganizations(id);
    return {
      id,
      roles: [this.configService.get('DEFAULT_USER_ROLE', 'free')],
      badges: [],
      organizations,
      activeOrganization: this.activeOrganization.get(id) ?? organizations[0]?.id ?? null,
    };
  }

  async updateRoles(id: string, payload: UpdateUserRoleDto) {
    this.logger.log(`Updating roles for ${id}`);
    await this.redisService.publish('user.role.updated', { id, roles: payload.roles });
    return { id, roles: payload.roles };
  }

  async assignFounderBadge(id: string) {
    this.logger.log(`Assigning founder badge to ${id}`);
    await this.redisService.publish('user.badge.assigned', {
      id,
      badge: 'founder',
    });
    return { id, badge: 'founder' };
  }

  async listOrganizations(userId: string) {
    this.ensurePersonalOrganization(userId);
    return this.organizationsByUser.get(userId) ?? [];
  }

  async getPrimaryOrganization(userId: string) {
    const organizations = await this.listOrganizations(userId);
    return organizations[0] ?? null;
  }

  async setActiveOrganization(userId: string, organizationId: string) {
    const organizations = await this.listOrganizations(userId);
    const match = organizations.find((org) => org.id === organizationId);
    if (!match) {
      throw new Error(`User ${userId} is not part of organization ${organizationId}`);
    }
    this.activeOrganization.set(userId, organizationId);
    await this.redisService.publish('user.organization.changed', {
      userId,
      organizationId,
    });
    return { userId, organizationId };
  }

  private ensurePersonalOrganization(userId: string) {
    if (this.organizationsByUser.has(userId)) {
      return;
    }
    const personalOrgId = `personal-${userId}`;
    this.organizationsByUser.set(userId, [
      {
        id: personalOrgId,
        name: `Personal organization for ${userId}`,
        role: 'owner',
      },
    ]);
    if (!this.activeOrganization.has(userId)) {
      this.activeOrganization.set(userId, personalOrgId);
    }
  }
}
