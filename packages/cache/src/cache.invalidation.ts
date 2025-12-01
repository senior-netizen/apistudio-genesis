import type Redis from 'ioredis';
import type { CacheService } from './cache.service';
import type { CacheScope } from './cache.utils';

export const CACHE_INVALIDATION_EVENT = 'cache:invalidate';

export type CacheInvalidationScope = CacheScope | 'global';

export interface CacheInvalidationEvent {
  model: string;
  scope: CacheInvalidationScope;
  ids?: string[];
  reason?: string;
}

export interface CacheEventBus {
  on: (event: string, listener: (payload: CacheInvalidationEvent) => void) => unknown;
  emit?: (event: string, payload: CacheInvalidationEvent) => unknown;
}

interface CacheInvalidationOptions {
  channel: string;
  bus?: CacheEventBus;
  publisher?: Redis;
  subscriber?: Redis;
  debug: boolean;
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
}

export class CacheInvalidationManager {
  constructor(private readonly cache: CacheService, private readonly options: CacheInvalidationOptions) {
    this.subscribeToEventBus();
    void this.subscribeToRedis();
  }

  async emit(event: CacheInvalidationEvent): Promise<void> {
    this.safeHandle(event);
    if (this.options.publisher) {
      try {
        await this.options.publisher.publish(this.options.channel, JSON.stringify(event));
      } catch (error) {
        this.logWarn('cache-invalidate-publish-failed', error);
      }
    }
    if (this.options.bus?.emit) {
      try {
        this.options.bus.emit(CACHE_INVALIDATION_EVENT, event);
      } catch (error) {
        this.logWarn('cache-invalidate-bus-failed', error);
      }
    }
  }

  private subscribeToEventBus(): void {
    if (!this.options.bus) {
      return;
    }
    try {
      this.options.bus.on(CACHE_INVALIDATION_EVENT, (event) => this.safeHandle(event));
    } catch (error) {
      this.logWarn('cache-invalidate-bus-subscribe-failed', error);
    }
  }

  private async subscribeToRedis(): Promise<void> {
    if (!this.options.subscriber) {
      return;
    }
    try {
      await this.options.subscriber.subscribe(this.options.channel);
      this.options.subscriber.on('message', (_channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message) as CacheInvalidationEvent;
          this.safeHandle(parsed);
        } catch (error) {
          this.logWarn('cache-invalidate-redis-parse-failed', error);
        }
      });
    } catch (error) {
      this.logWarn('cache-invalidate-redis-subscribe-failed', error);
    }
  }

  private safeHandle(event: CacheInvalidationEvent): void {
    void this.handleEvent(event).catch((error) => {
      this.logWarn('cache-invalidate-handle-failed', error);
    });
  }

  private async handleEvent(event: CacheInvalidationEvent): Promise<void> {
    const ids = event.ids || [];
    switch (event.scope) {
      case 'user':
        for (const id of ids) {
          await this.cache.invalidateUserBucket(id);
        }
        break;
      case 'workspace':
        for (const id of ids) {
          await this.cache.invalidateWorkspaceBucket(id);
        }
        break;
      case 'global':
      default:
        await this.cache.invalidateGlobalBucket();
        break;
    }
  }

  private logWarn(event: string, detail: unknown): void {
    if (this.options.debug || process.env.CACHE_DEBUG === 'true') {
      this.options.logger.warn(`[${event}]`, detail);
    }
  }
}
