import {
  Queue,
  QueueEvents,
  QueueScheduler,
  type QueueBaseOptions,
  type QueueEventsInstance,
  type QueueSchedulerInstance,
  type QueueInstance,
} from './bullmq';
import Redis, { type RedisOptions } from 'ioredis';

export type RedisDiscoveryOptions = {
  url?: string;
  host?: string;
  port?: number;
  tls?: boolean;
  createClient?: (scope?: string) => Redis;
  connection?: Redis;
  enabled?: boolean;
  redisOptions?: RedisOptions;
};

export type QueueFactoryOptions = {
  name: string;
  defaultJobOptions?: QueueBaseOptions['defaultJobOptions'];
  connection?: Redis;
  redis?: RedisDiscoveryOptions;
};

export type QueueBundle<T = unknown> = {
  queue: QueueInstance<T>;
  scheduler?: QueueSchedulerInstance;
  events?: QueueEventsInstance;
};

const truthy = (value?: string): boolean => value === 'true' || value === '1' || value === 'yes';

export const resolveRedisDiscovery = (options?: RedisDiscoveryOptions): { connection?: Redis; disabled: boolean } => {
  const disabled = options?.enabled === false || truthy(process.env.REDIS_DISABLED);
  if (disabled) return { disabled: true };

  if (options?.connection) return { connection: options.connection, disabled: false };

  const url = options?.url ?? process.env.REDIS_URL ?? process.env.WS_REDIS_URL;
  const host = options?.host ?? process.env.WS_REDIS_HOST;
  const portValue = options?.port ?? (process.env.WS_REDIS_PORT ? Number(process.env.WS_REDIS_PORT) : undefined);

  if (options?.createClient) {
    return { connection: options.createClient('queue'), disabled: false };
  }

  if (url) {
    return {
      connection: new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null, ...options?.redisOptions }),
      disabled: false,
    };
  }

  if (host && portValue) {
    return {
      connection: new Redis({
        host,
        port: portValue,
        tls: options?.tls ? {} : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        ...options?.redisOptions,
      }),
      disabled: false,
    };
  }

  return { disabled: true };
};

export const createQueueBundle = <T = unknown>(options: QueueFactoryOptions): QueueBundle<T> => {
  const { name, defaultJobOptions, redis } = options;
  const { connection } = resolveRedisDiscovery({ ...redis, connection: options.connection });

  const queueOptions: QueueBaseOptions = {
    connection: connection ?? undefined,
    defaultJobOptions,
  } as QueueBaseOptions;

  const queue = new Queue<T>(name, queueOptions);
  const scheduler = connection ? new QueueScheduler(name, { connection }) : undefined;
  const events = connection ? new QueueEvents(name, { connection }) : undefined;

  return { queue, scheduler, events };
};
