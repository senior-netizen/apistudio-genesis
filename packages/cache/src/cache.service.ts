import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { sharedLogger } from '../../../squirrel/shared/logger/index.js';
import { BucketManager, CacheBucket } from './bucket.manager';
import {
  autoDetectConfig,
  buildCacheKey,
  CacheScope,
  defaultEnv,
  shouldBypassCache,
  sanitizePattern,
} from './cache.utils';
import { CacheInvalidationManager, CacheEventBus, CacheInvalidationEvent } from './cache.invalidation';
import { SecureCache } from './cache.secure';

export interface CacheContext {
  userId?: string;
  workspaceId?: string;
  scope?: CacheScope;
  scopeId?: string;
}

export interface CacheOptions {
  redisUrl?: string;
  redisClient?: Redis;
  redisSubscriber?: Redis;
  redisPublisher?: Redis;
  env?: string;
  releaseVersion?: string;
  defaultTtlSeconds?: number;
  lruSize?: number;
  debug?: boolean;
  logger?: typeof sharedLogger;
  hmacSecret?: string;
  invalidationChannel?: string;
  eventBus?: CacheEventBus;
}

interface ResolvedCacheOptions extends CacheOptions {
  env: string;
  debug: boolean;
  defaultTtlSeconds: number;
}

export class CacheService {
  static async create(options?: CacheOptions): Promise<CacheService> {
    const detected = await autoDetectConfig();
    const env = options?.env || detected.env || defaultEnv();
    const defaultTtlSeconds = options?.defaultTtlSeconds ?? 300;
    const debug = options?.debug ?? process.env.CACHE_DEBUG === 'true';
    return new CacheService({
      env,
      redisUrl: options?.redisUrl || detected.redisUrl,
      redisClient: options?.redisClient,
      redisSubscriber: options?.redisSubscriber,
      redisPublisher: options?.redisPublisher,
      releaseVersion: options?.releaseVersion || detected.releaseVersion,
      defaultTtlSeconds,
      lruSize: options?.lruSize,
      debug,
      logger: options?.logger,
      hmacSecret: options?.hmacSecret,
      invalidationChannel: options?.invalidationChannel,
      eventBus: options?.eventBus,
    });
  }

  private readonly logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  private redisClient?: Redis;
  private readonly bucketManager: BucketManager;
  private readonly fallbackCache: LRUCache<string, string>;
  private redisDisabled: boolean;
  private readonly invalidationManager: CacheInvalidationManager;
  public readonly secure: SecureCache;

  constructor(private readonly options: ResolvedCacheOptions) {
    this.logger = options.logger || sharedLogger || {
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    this.redisClient = options.redisClient;
    this.bucketManager = new BucketManager(this);
    this.redisDisabled = !options.redisUrl && !options.redisClient;
    this.fallbackCache = new LRUCache({
      max: options.lruSize ?? 500,
      ttl: (options.defaultTtlSeconds ?? 300) * 1000,
      allowStale: false,
    });

    if (options.redisUrl && !this.redisClient) {
      this.redisClient = new Redis(options.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 5,
        retryStrategy: (times) => Math.min(1000 * 2 ** times, 15000),
      });
      void this.redisClient.connect().catch(() => {
        this.redisDisabled = true;
      });
      this.redisClient.on('error', () => {
        this.redisDisabled = true;
      });
      this.redisClient.on('ready', () => {
        this.redisDisabled = false;
      });
    }

    void this.ensureReleaseVersion();

    this.invalidationManager = new CacheInvalidationManager(this, {
      channel: options.invalidationChannel || 'cache:invalidate',
      bus: options.eventBus,
      publisher: options.redisPublisher,
      subscriber: options.redisSubscriber,
      debug: this.options.debug,
      logger: this.logger,
    });

    this.secure = new SecureCache(this, {
      secret: options.hmacSecret,
      debug: this.options.debug,
      logger: this.logger,
    });
  }

  get global() {
    return this.bucketManager.getGlobal();
  }

  forWorkspace(workspaceId: string) {
    return this.bucketManager.forWorkspace(workspaceId);
  }

  forUser(userId: string) {
    return this.bucketManager.forUser(userId);
  }

  async get<T>(key: string, context?: CacheContext): Promise<T | null> {
    const bucket = this.resolveBucket(context);
    const namespaced = buildCacheKey(bucket.scope, this.options.env, key, bucket.scopeId);
    const value = await this.read<T>(namespaced);
    if (value !== null) {
      this.emitDiagnostic('cache-hit', namespaced);
    } else {
      this.emitDiagnostic('cache-miss', namespaced);
    }
    return value;
  }

  async set(key: string, value: unknown, ttlSeconds?: number, context?: CacheContext): Promise<void> {
    const bucket = this.resolveBucket(context);
    const ttl = this.resolveTtl(bucket.scope, ttlSeconds);
    if (shouldBypassCache(key, value)) {
      this.emitDiagnostic('cache-skip', key);
      return;
    }
    const namespaced = buildCacheKey(bucket.scope, this.options.env, key, bucket.scopeId);
    await this.write(namespaced, value, ttl);
  }

  async invalidate(key: string, context?: CacheContext): Promise<void> {
    const bucket = this.resolveBucket(context);
    const namespaced = buildCacheKey(bucket.scope, this.options.env, key, bucket.scopeId);
    await this.remove(namespaced);
    this.emitDiagnostic('cache-invalid', namespaced);
  }

  async wrap<T>(key: string, ttlSeconds: number | undefined, fetchFn: () => Promise<T>, context?: CacheContext): Promise<T> {
    const existing = await this.get<T>(key, context);
    if (existing !== null && existing !== undefined) {
      return existing;
    }
    const result = await fetchFn();
    await this.set(key, result, ttlSeconds, context);
    return result;
  }

  async invalidateUserBucket(userId: string): Promise<void> {
    await this.invalidateBucket('user', userId);
  }

  async invalidateWorkspaceBucket(workspaceId: string): Promise<void> {
    await this.invalidateBucket('workspace', workspaceId);
  }

  async invalidateGlobalBucket(): Promise<void> {
    await this.invalidateBucket('global');
  }

  async emitInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
    await this.invalidationManager.emit(event);
  }

  async clearPattern(pattern?: string): Promise<number> {
    const safePattern = sanitizePattern(pattern);
    if (/:(bull|queue|lock|meta)/i.test(safePattern)) {
      throw new Error('Refusing to clear protected system keys');
    }
    return this.deleteByPattern(safePattern);
  }

  private async ensureReleaseVersion(): Promise<void> {
    if (!this.options.releaseVersion) {
      return;
    }
    const key = buildCacheKey('global', this.options.env, '__release', 'global');
    const previous = await this.read<string>(key);
    if (previous && previous !== this.options.releaseVersion) {
      await this.invalidateBucket('global');
    }
    await this.write(key, this.options.releaseVersion, this.options.defaultTtlSeconds);
  }

  private resolveBucket(context?: CacheContext): CacheBucket {
    if (context?.scope) {
      return new CacheBucket(this, context.scope, context.scopeId);
    }
    return this.bucketManager.resolve(context);
  }

  private resolveTtl(scope: CacheScope, ttlSeconds?: number): number {
    if (scope === 'user') {
      if (ttlSeconds === undefined) {
        throw new Error('User cache entries require an explicit TTL');
      }
      return ttlSeconds;
    }
    return ttlSeconds ?? this.options.defaultTtlSeconds ?? 300;
  }

  private async read<T>(fullKey: string): Promise<T | null> {
    const client = await this.getRedis();
    if (client) {
      try {
        const raw = await client.get(fullKey);
        if (raw === null) {
          return null;
        }
        return JSON.parse(raw) as T;
      } catch (error) {
        this.redisDisabled = true;
        this.emitDiagnostic('cache-fallback', fullKey);
      }
    }
    const fallback = this.fallbackCache.get(fullKey);
    return fallback ? (JSON.parse(fallback) as T) : null;
  }

  private async write(fullKey: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const client = await this.getRedis();
    if (client && !this.redisDisabled) {
      try {
        await client.set(fullKey, serialized, 'EX', ttlSeconds);
        return;
      } catch (error) {
        this.redisDisabled = true;
        this.emitDiagnostic('cache-fallback', fullKey);
      }
    }
    this.fallbackCache.set(fullKey, serialized, { ttl: ttlSeconds * 1000 });
  }

  private async remove(fullKey: string): Promise<void> {
    const client = await this.getRedis();
    if (client && !this.redisDisabled) {
      try {
        await client.del(fullKey);
      } catch {
        this.redisDisabled = true;
      }
    }
    this.fallbackCache.delete(fullKey);
  }

  private async invalidateBucket(scope: CacheScope, scopeId?: string): Promise<void> {
    const prefix = buildCacheKey(scope, this.options.env, '', scopeId).replace(/:+$/, '');
    await this.deleteByPattern(`${prefix}*`);
  }

  private async deleteByPattern(pattern: string): Promise<number> {
    let deleted = 0;
    const client = await this.getRedis();
    if (client && !this.redisDisabled) {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) {
          deleted += await client.del(...keys);
        }
      } while (cursor !== '0');
    }

    for (const key of this.fallbackCache.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) {
        this.fallbackCache.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  private async getRedis(): Promise<Redis | null> {
    if (this.redisDisabled) {
      return null;
    }
    return this.redisClient ?? null;
  }

  private emitDiagnostic(event: string, key: string): void {
    if (!this.options.debug && process.env.CACHE_DEBUG !== 'true') {
      return;
    }
    this.logger.info(`[${event}] ${key}`);
  }
}
