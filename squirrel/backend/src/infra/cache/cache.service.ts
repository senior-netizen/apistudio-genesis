import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import appConfig from '../../config/configuration';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly redisService: RedisService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.redis.enabled) return null;
    const client = await this.redisService.getClient();
    const value = await client.get(this.buildKey(key));
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn({ msg: 'Failed to parse cache payload', key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.config.redis.enabled) return;
    const client = await this.redisService.getClient();
    await client.set(this.buildKey(key), JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.config.redis.enabled) return;
    const client = await this.redisService.getClient();
    await client.del(this.buildKey(key));
  }

  async delPrefix(prefix: string): Promise<void> {
    if (!this.config.redis.enabled) return;
    const client = await this.redisService.getClient();
    const pattern = `${this.buildKey(prefix)}*`;
    const stream = client.scanStream({ match: pattern });
    const keys: string[] = [];
    for await (const resultKeys of stream) {
      for (const key of resultKeys as string[]) {
        keys.push(key);
      }
    }
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  private buildKey(key: string): string {
    return `cache:${key}`;
  }
}
