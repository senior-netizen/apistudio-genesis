import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { CacheService } from '../src/cache.service';
import { CACHE_INVALIDATION_EVENT } from '../src/cache.invalidation';
import { buildCacheKey, hashPrefix, shouldBypassCache } from '../src/cache.utils';

class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = mode === 'EX' && typeof ttlSeconds === 'number' ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    keys.forEach((key) => {
      if (this.store.delete(key)) {
        count += 1;
      }
    });
    return count;
  }

  async scan(
    cursor: string,
    _matchCommand: string,
    pattern: string,
    _countCommand?: string,
    _count?: number,
  ): Promise<[string, string[]]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    const keys = Array.from(this.store.keys()).filter((key) => regex.test(key));
    return ['0', keys];
  }

  on() {
    return this;
  }

  connect() {
    return Promise.resolve(this);
  }
}

const createCache = async () => CacheService.create({ env: 'test', redisClient: new MemoryRedis() as never });

class MockPubSubRedis extends EventEmitter {
  private static bus = new EventEmitter();

  async publish(channel: string, message: string): Promise<number> {
    MockPubSubRedis.bus.emit(channel, message);
    MockPubSubRedis.bus.emit('message', channel, message);
    return 1;
  }

  async subscribe(channel: string): Promise<void> {
    MockPubSubRedis.bus.on(channel, (message: string) => {
      this.emit('message', channel, message);
    });
  }
}

describe('bucket prefix generation', () => {
  it('builds hashed prefixes for buckets', () => {
    const key = buildCacheKey('workspace', 'prod', 'example', 'abc123');
    const hashed = hashPrefix('prod', 'abc123');
    expect(key).toBe(`squirrel:prod:workspace:abc123:${hashed}:example`);
  });
});

describe('cache isolation and overrides', () => {
  let cache: CacheService;

  beforeEach(async () => {
    cache = await createCache();
  });

  it('prefers user bucket over workspace and global', async () => {
    await cache.set('item', 'global-value');
    await cache.set('item', 'workspace-value', undefined, { workspaceId: 'w1' });
    await cache.set('item', 'user-value', 60, { userId: 'u1', workspaceId: 'w1' });

    const value = await cache.get<string>('item', { userId: 'u1', workspaceId: 'w1' });
    expect(value).toBe('user-value');
  });

  it('prefers workspace bucket over global', async () => {
    await cache.set('item', 'global-value');
    await cache.set('item', 'workspace-value', undefined, { workspaceId: 'w1' });

    const value = await cache.get<string>('item', { workspaceId: 'w1' });
    expect(value).toBe('workspace-value');
  });
});

describe('ttl enforcement and secrets', () => {
  let cache: CacheService;

  beforeEach(async () => {
    cache = await createCache();
  });

  it('requires ttl for user buckets', async () => {
    await expect(cache.set('user-key', 'value', undefined, { userId: 'u1' })).rejects.toThrow(
      /explicit TTL/,
    );
  });

  it('enforces ttl expiry', async () => {
    vi.useFakeTimers();
    await cache.set('short-key', 'value', 1, { userId: 'u1' });
    expect(await cache.get('short-key', { userId: 'u1' })).toBe('value');
    vi.advanceTimersByTime(1100);
    expect(await cache.get('short-key', { userId: 'u1' })).toBeNull();
    vi.useRealTimers();
  });

  it('skips caching secrets', async () => {
    await cache.set('api_token_key', { data: 'value' }, 30, { userId: 'u1' });
    const result = await cache.get('api_token_key', { userId: 'u1' });
    expect(result).toBeNull();
    expect(shouldBypassCache('api_token_key', { data: 'value' })).toBe(true);
  });
});

describe('bucket invalidation', () => {
  let cache: CacheService;

  beforeEach(async () => {
    cache = await createCache();
  });

  it('invalidates user bucket on logout or permission change', async () => {
    await cache.set('profile', 'value', 30, { userId: 'u1' });
    expect(await cache.get('profile', { userId: 'u1' })).toBe('value');
    await cache.invalidateUserBucket('u1');
    expect(await cache.get('profile', { userId: 'u1' })).toBeNull();
  });

  it('invalidates workspace bucket on settings update', async () => {
    await cache.set('settings', 'value', undefined, { workspaceId: 'w1' });
    expect(await cache.get('settings', { workspaceId: 'w1' })).toBe('value');
    await cache.invalidateWorkspaceBucket('w1');
    expect(await cache.get('settings', { workspaceId: 'w1' })).toBeNull();
  });
});

describe('fallback LRU mode', () => {
  it('uses in-memory cache when redis is unavailable', async () => {
    const cache = await CacheService.create({ env: 'test', redisUrl: undefined });
    await cache.set('lru-key', 'lru', 1);
    expect(await cache.get('lru-key')).toBe('lru');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(await cache.get('lru-key')).toBeNull();
  });
});

describe('secure cache', () => {
  beforeEach(() => {
    process.env.CACHE_HMAC_SECRET = 'test-secret';
  });

  it('returns cached result only when signature matches', async () => {
    const cache = await CacheService.create({ env: 'test', redisClient: new MemoryRedis() as never });
    const fetcher = vi.fn().mockResolvedValue('secure-value');
    const payload = { query: 'one' };

    const first = await cache.secure.wrap('secure-key', 30, fetcher, payload);
    expect(first).toBe('secure-value');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const second = await cache.secure.wrap('secure-key', 30, fetcher, payload);
    expect(second).toBe('secure-value');
    expect(fetcher).toHaveBeenCalledTimes(1);

    await cache.secure.wrap('secure-key', 30, fetcher, { query: 'two' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('skips caching when payload includes sensitive fields', async () => {
    const cache = await CacheService.create({ env: 'test', redisClient: new MemoryRedis() as never });
    const fetcher = vi.fn().mockResolvedValue('no-cache');
    const payload = { password: 'secret', meta: 'data' };

    await cache.secure.wrap('sensitive-key', 30, fetcher, payload);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const cached = await cache.secure.get('sensitive-key', payload);
    expect(cached).toBeNull();
    await cache.secure.wrap('sensitive-key', 30, fetcher, payload);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('cache invalidation events', () => {
  let bus: EventEmitter;
  let cache: CacheService;

  beforeEach(async () => {
    bus = new EventEmitter();
    cache = await CacheService.create({ env: 'test', redisClient: new MemoryRedis() as never, eventBus: bus });
  });

  it('invalidates user scope entries', async () => {
    await cache.set('profile', 'value', 30, { userId: 'user1' });
    expect(await cache.get('profile', { userId: 'user1' })).toBe('value');
    bus.emit(CACHE_INVALIDATION_EVENT, { model: 'User', scope: 'user', ids: ['user1'] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await cache.get('profile', { userId: 'user1' })).toBeNull();
  });

  it('invalidates workspace scope entries', async () => {
    await cache.set('settings', 'value', undefined, { workspaceId: 'workspace1' });
    expect(await cache.get('settings', { workspaceId: 'workspace1' })).toBe('value');
    bus.emit(CACHE_INVALIDATION_EVENT, { model: 'Workspace', scope: 'workspace', ids: ['workspace1'] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await cache.get('settings', { workspaceId: 'workspace1' })).toBeNull();
  });

  it('invalidates global scope entries', async () => {
    await cache.set('system', 'value');
    expect(await cache.get('system')).toBe('value');
    bus.emit(CACHE_INVALIDATION_EVENT, { model: 'SystemSettings', scope: 'global' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await cache.get('system')).toBeNull();
  });
});

describe('multi-instance invalidation with pub/sub', () => {
  it('broadcasts invalidations across subscribers', async () => {
    const sharedRedis = new MemoryRedis() as never;
    const publisher = new MockPubSubRedis();
    const subscriberA = new MockPubSubRedis();
    const subscriberB = new MockPubSubRedis();

    const cacheA = await CacheService.create({
      env: 'test',
      redisClient: sharedRedis,
      redisPublisher: publisher as never,
      redisSubscriber: subscriberA as never,
    });

    const cacheB = await CacheService.create({
      env: 'test',
      redisClient: sharedRedis,
      redisSubscriber: subscriberB as never,
    });

    await cacheB.set('profile', 'value', 30, { userId: 'user1' });
    expect(await cacheB.get('profile', { userId: 'user1' })).toBe('value');

    await cacheA.emitInvalidationEvent({ model: 'User', scope: 'user', ids: ['user1'] });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(await cacheB.get('profile', { userId: 'user1' })).toBeNull();
  });
});

describe('resilience when event bus fails', () => {
  it('continues invalidation even if bus subscription throws', async () => {
    const faultyBus = {
      on() {
        throw new Error('bus failure');
      },
    } as unknown as EventEmitter;

    const cache = await CacheService.create({ env: 'test', redisClient: new MemoryRedis() as never, eventBus: faultyBus });
    await cache.set('system', 'value');
    await cache.emitInvalidationEvent({ model: 'System', scope: 'global' });
    expect(await cache.get('system')).toBeNull();
  });
});
