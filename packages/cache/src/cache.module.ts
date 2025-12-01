import { CacheService, type CacheOptions } from './cache.service';

export class CacheModule {
  static async register(options?: CacheOptions): Promise<CacheService> {
    return CacheService.create(options);
  }
}
