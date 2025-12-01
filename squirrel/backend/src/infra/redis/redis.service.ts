import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis, { Redis, RedisOptions } from 'ioredis';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client?: Redis;

  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {
    if (config.redis.enabled) {
      const options: RedisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 5000,
        retryStrategy: (times) => Math.min(1000 * Math.pow(2, times), 10000),
      };
      this.client = new IORedis(config.redis.url, options);
    }
  }

  async getClient(): Promise<Redis> {
    if (!this.config.redis.enabled) {
      throw new Error('Redis disabled by configuration');
    }
    if (!this.client) throw new Error('Redis client not initialized');
    if (!this.client.status || this.client.status === 'end') {
      await this.client.connect();
    }
    return this.client;
  }

  duplicate(scope = 'default'): Redis {
    if (!this.config.redis.enabled || !this.client) {
      throw new Error('Redis disabled by configuration');
    }
    return this.client.duplicate({
      connectionName: `squirrel:${scope}`,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  // --- Auth helpers: token revocation and device codes ---
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    const key = `auth:blacklist:${jti}`;
    await this.client.set(key, '1', 'EX', Math.max(1, ttlSeconds));
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!this.client) return false;
    const key = `auth:blacklist:${jti}`;
    const val = await this.client.get(key);
    return val === '1';
  }

  async publishRevocation(payload: { userId: string; jti?: string; all?: boolean; clientType?: string }): Promise<void> {
    if (!this.client) return;
    await this.client.publish('auth:revocations', JSON.stringify(payload));
  }

  async setDeviceCode(record: {
    deviceCode: string;
    userCode: string;
    clientType: string;
    scope?: string;
    expiresInSec: number;
  }): Promise<void> {
    if (!this.client) return;
    const key = `auth:device:${record.deviceCode}`;
    const data = {
      deviceCode: record.deviceCode,
      userCode: record.userCode,
      clientType: record.clientType,
      scope: record.scope,
      state: 'pending',
    } as const;
    await this.client.set(key, JSON.stringify(data), 'EX', Math.max(30, record.expiresInSec));
    await this.client.set(`auth:device_user:${record.userCode}`, record.deviceCode, 'EX', Math.max(30, record.expiresInSec));
  }

  async approveDeviceCode(userCode: string, userId: string): Promise<boolean> {
    if (!this.client) return false;
    const deviceKey = await this.client.get(`auth:device_user:${userCode}`);
    if (!deviceKey) return false;
    const key = `auth:device:${deviceKey}`;
    const raw = await this.client.get(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    parsed.state = 'approved';
    parsed.userId = userId;
    await this.client.set(key, JSON.stringify(parsed));
    return true;
  }

  async consumeDeviceCode(deviceCode: string): Promise<{ userId: string; clientType: string; scope?: string } | null> {
    if (!this.client) return null;
    const key = `auth:device:${deviceCode}`;
    const raw = await this.client.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.state !== 'approved' || !parsed.userId) return null;
    await this.client.del(key);
    return { userId: parsed.userId, clientType: parsed.clientType, scope: parsed.scope };
  }
}
