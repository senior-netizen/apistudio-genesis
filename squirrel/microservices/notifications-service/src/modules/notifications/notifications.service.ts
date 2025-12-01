import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../config/redis.service';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('notifications.dispatch', (message) => {
      this.logger.log(`Dispatching notification from event bus: ${message}`);
    });
  }

  async dispatch(payload: DispatchNotificationDto) {
    const defaultChannel = this.configService.get('DEFAULT_NOTIFICATION_CHANNEL', 'email');
    await this.redisService.publish('notifications.dispatch', { ...payload, defaultChannel });
    return { status: 'queued', payload };
  }

  async publishOrganizationEvent(orgId: string, type: string, payload: Record<string, unknown>) {
    const channel = `organization:${orgId}:events`;
    await this.redisService.publish(channel, { type, ...payload });
    this.logger.debug(`Published organization event ${type} to ${channel}`);
    return { status: 'published', type, orgId };
  }

  async updatePresence(orgId: string, userId: string, action: 'join' | 'leave') {
    const channel = `organization:${orgId}:presence`;
    await this.redisService.publish(channel, { type: `org.presence.${action}`, userId });
    this.logger.debug(`Presence ${action} for user ${userId} in organization ${orgId}`);
    return { status: 'published', orgId, userId, action };
  }
}
