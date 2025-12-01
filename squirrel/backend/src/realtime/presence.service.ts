import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../infrastructure/redis/redis.tokens';

@Injectable()
export class PresenceService {
  private readonly setKey = 'presence:online';
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addUser(userId: string) { await this.redis.sadd(this.setKey, userId); }
  async removeUser(userId: string) { await this.redis.srem(this.setKey, userId); }
  async getOnlineUsers(): Promise<string[]> { return (await this.redis.smembers(this.setKey)) ?? []; }
}

