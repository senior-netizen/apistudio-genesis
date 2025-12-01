import type { CacheService, CacheContext } from './cache.service';
import type { CacheScope } from './cache.utils';

export class CacheBucket {
  constructor(
    private readonly service: CacheService,
    public readonly scope: CacheScope,
    public readonly scopeId?: string,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.service.get<T>(key, { scope: this.scope, scopeId: this.scopeId });
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.service.set(key, value, ttlSeconds, { scope: this.scope, scopeId: this.scopeId });
  }

  async invalidate(key: string): Promise<void> {
    await this.service.invalidate(key, { scope: this.scope, scopeId: this.scopeId });
  }

  async wrap<T>(key: string, ttlSeconds: number | undefined, fetchFn: () => Promise<T>): Promise<T> {
    return this.service.wrap(key, ttlSeconds, fetchFn, { scope: this.scope, scopeId: this.scopeId });
  }
}

export class BucketManager {
  private userBuckets = new Map<string, CacheBucket>();
  private workspaceBuckets = new Map<string, CacheBucket>();
  private globalBucket: CacheBucket;

  constructor(private readonly service: CacheService) {
    this.globalBucket = new CacheBucket(service, 'global');
  }

  resolve(context?: CacheContext): CacheBucket {
    if (context?.userId) {
      return this.forUser(context.userId);
    }
    if (context?.workspaceId) {
      return this.forWorkspace(context.workspaceId);
    }
    return this.globalBucket;
  }

  getGlobal(): CacheBucket {
    return this.globalBucket;
  }

  forWorkspace(workspaceId: string): CacheBucket {
    if (!this.workspaceBuckets.has(workspaceId)) {
      this.workspaceBuckets.set(workspaceId, new CacheBucket(this.service, 'workspace', workspaceId));
    }
    return this.workspaceBuckets.get(workspaceId)!;
  }

  forUser(userId: string): CacheBucket {
    if (!this.userBuckets.has(userId)) {
      this.userBuckets.set(userId, new CacheBucket(this.service, 'user', userId));
    }
    return this.userBuckets.get(userId)!;
  }
}
