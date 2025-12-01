import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.tokens';

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null; try { return JSON.parse(raw) as T; } catch { return null; }
  }
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds > 0) await this.redis.set(key, payload, 'EX', ttlSeconds); else await this.redis.set(key, payload);
  }
  async del(key: string): Promise<void> { await this.redis.del(key); }
}

