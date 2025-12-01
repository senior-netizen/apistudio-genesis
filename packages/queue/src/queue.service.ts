import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import {
  Queue,
  Worker,
  type QueueInstance,
  type WorkerInstance,
  type JobsOptions,
  type Processor,
  type WorkerOptions,
  type QueueEventsListener,
} from './bullmq';
import { createQueueBundle, resolveRedisDiscovery, type QueueBundle, type RedisDiscoveryOptions } from './queue.factory';

export type LoggerLike = Pick<typeof console, 'log' | 'warn' | 'error'> & { debug?: (...args: any[]) => void };

export type RegisteredJob<T = unknown> = {
  name: string;
  queueName: string;
  defaultOptions?: JobsOptions;
};

export type QueueServiceOptions = {
  queueNames?: string[];
  jobsDir?: string;
  workersDir?: string;
  logger?: LoggerLike;
  concurrency?: number;
  redis?: RedisDiscoveryOptions;
  defaultJobOptions?: JobsOptions;
  enableWorkers?: boolean;
};

type QueueCounts = {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
};

type QueueLike = Pick<QueueInstance, 'add' | 'getJobCounts' | 'close'> & { readonly name: string };

type InMemoryJob<T> = {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  opts: JobsOptions;
};

class InMemoryQueue<T = unknown> implements QueueLike {
  readonly name: string;
  private readonly concurrency: number;
  private readonly emitter: EventEmitter;
  private readonly logger: LoggerLike;
  private processor?: Processor<T>;
  private running = 0;
  private readonly jobs: InMemoryJob<T>[] = [];
  private readonly counts: QueueCounts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };

  constructor(name: string, emitter: EventEmitter, logger: LoggerLike, concurrency: number) {
    this.name = name;
    this.emitter = emitter;
    this.logger = logger;
    this.concurrency = Math.max(1, concurrency);
  }

  async add(name: string, data: unknown, opts?: JobsOptions): Promise<InMemoryJob<T>> {
    const job: InMemoryJob<T> = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      data: data as T,
      attemptsMade: 0,
      opts: opts ?? {},
    };
    this.jobs.push(job);
    this.counts.waiting += 1;
    const delayMs = (job.opts.delay as number | undefined) ?? 0;
    if (delayMs && delayMs > 0) {
      this.counts.delayed += 1;
      setTimeout(() => {
        this.counts.delayed -= 1;
        this.counts.waiting += 1;
        void this.processNext();
      }, delayMs);
    } else {
      void this.processNext();
    }
    return job;
  }

  process(handler: Processor<T>): void {
    this.processor = handler;
    void this.processNext();
  }

  private async processNext(): Promise<void> {
    if (!this.processor) return;
    if (this.running >= this.concurrency) return;
    const next = this.jobs.shift();
    if (!next) return;

    this.running += 1;
    this.counts.waiting = Math.max(0, this.counts.waiting - 1);
    this.counts.active += 1;

    try {
      await this.processor({ id: next.id, name: next.name, data: next.data, attemptsMade: next.attemptsMade } as any);
      this.counts.active -= 1;
      this.counts.completed += 1;
      this.emitter.emit('completed', { jobId: next.id, name: next.name, queueName: this.name });
    } catch (error) {
      this.counts.active -= 1;
      const attempts = typeof next.opts.attempts === 'number' ? next.opts.attempts : 1;
      next.attemptsMade += 1;
      const backoff = typeof next.opts.backoff === 'number' ? next.opts.backoff : (next.opts.backoff as any)?.delay ?? 0;
      if (next.attemptsMade < attempts) {
        this.logger.warn?.(`Retrying job ${next.name} in memory (attempt ${next.attemptsMade}/${attempts})`);
        this.emitter.emit('failed', { jobId: next.id, name: next.name, queueName: this.name, failedReason: (error as Error)?.message });
        const delay = backoff || 0;
        setTimeout(() => {
          this.jobs.push(next);
          this.counts.waiting += 1;
          void this.processNext();
        }, delay);
      } else {
        this.counts.failed += 1;
        this.emitter.emit('failed', { jobId: next.id, name: next.name, queueName: this.name, failedReason: (error as Error)?.message });
      }
    } finally {
      this.running -= 1;
      setImmediate(() => void this.processNext());
    }
  }

  async getJobCounts(): Promise<QueueCounts> {
    return { ...this.counts };
  }

  async close(): Promise<void> {
    this.jobs.splice(0, this.jobs.length);
  }
}

const defaultLogger: LoggerLike = {
  log: (...args) => console.log('[queue]', ...args),
  warn: (...args) => console.warn('[queue]', ...args),
  error: (...args) => console.error('[queue]', ...args),
  debug: (...args) => console.debug?.('[queue]', ...args),
};

const shouldStartWorkers = (explicit?: boolean): boolean => {
  if (typeof explicit === 'boolean') return explicit;
  const lifecycle = process.env.npm_lifecycle_event ?? '';
  if (process.env.NODE_ENV === 'test') return false;
  if (lifecycle.includes('test') || lifecycle.includes('lint') || lifecycle.includes('build')) return false;
  return true;
};

export class QueueService {
  readonly events = new EventEmitter();
  private readonly queues = new Map<string, QueueLike>();
  private readonly jobs = new Map<string, RegisteredJob<any>>();
  private readonly logger: LoggerLike;
  private readonly concurrency: number;
  private readonly defaultJobOptions?: JobsOptions;
  private readonly redisOptions?: RedisDiscoveryOptions;
  private readonly workersDir: string;
  private readonly jobsDir: string;
  private readonly startWorkers: boolean;

  constructor(private readonly options?: QueueServiceOptions) {
    this.logger = options?.logger ?? defaultLogger;
    this.concurrency = Math.max(1, options?.concurrency ?? Number(process.env.QUEUE_CONCURRENCY ?? 5));
    this.defaultJobOptions = options?.defaultJobOptions;
    this.redisOptions = options?.redis;
    this.workersDir = options?.workersDir ?? path.join(__dirname, 'workers');
    this.jobsDir = options?.jobsDir ?? path.join(__dirname, 'jobs');
    this.startWorkers = shouldStartWorkers(options?.enableWorkers);
  }

  async init(): Promise<void> {
    const queueNames = new Set<string>(this.options?.queueNames ?? []);
    await this.loadJobs(queueNames);
    queueNames.forEach((name) => this.ensureQueue(name));
    if (this.startWorkers) {
      await this.loadWorkers();
    }
  }

  registerJob<T>(job: RegisteredJob<T>): void {
    this.jobs.set(job.name, job as RegisteredJob<any>);
    this.ensureQueue(job.queueName, job.defaultOptions);
  }

  async addJob<T>(job: RegisteredJob<T> | string, payload: T, options?: JobsOptions) {
    const resolvedJob = typeof job === 'string' ? this.jobs.get(job) : job;
    const queueName = resolvedJob?.queueName ?? (typeof job === 'string' ? job : job.queueName);
    const jobName = resolvedJob?.name ?? (typeof job === 'string' ? job : job.name);
    const queue = this.ensureQueue(queueName, resolvedJob?.defaultOptions);

    const attempts = options?.attempts ?? resolvedJob?.defaultOptions?.attempts ?? this.defaultJobOptions?.attempts;
    const merged: JobsOptions = {
      ...this.defaultJobOptions,
      ...resolvedJob?.defaultOptions,
      ...options,
      attempts,
    };

    return queue.add(jobName, payload, merged as any);
  }

  getQueue(name: string): QueueLike {
    const existing = this.queues.get(name);
    if (existing) return existing;
    return this.ensureQueue(name);
  }

  async createWorker<T>(job: RegisteredJob<T>, processor: Processor<T>, options?: WorkerOptions): Promise<WorkerInstance | InMemoryQueue<T>> {
    this.registerJob(job);
    const queue = this.ensureQueue(job.queueName, job.defaultOptions);
    const redis = resolveRedisDiscovery(this.redisOptions);

    if (redis.disabled || queue instanceof InMemoryQueue) {
      (queue as InMemoryQueue<T>).process(processor);
      return queue as InMemoryQueue<T>;
    }

    const worker = new Worker(job.queueName, processor, {
      concurrency: this.concurrency,
      connection: redis.connection,
      ...options,
    });
    worker.on('completed', (completed: any) => this.events.emit('completed', { ...completed, queueName: job.queueName }));
    worker.on('failed', (failed: any) => this.events.emit('failed', { ...failed, queueName: job.queueName }));
    worker.on('stalled', (stalled: any) => this.events.emit('stalled', { ...stalled, queueName: job.queueName }));
    return worker;
  }

  async getHealth(): Promise<{ status: 'ok'; queueCount: number; jobCounts: QueueCounts; failedJobs: number }> {
    let queueCount = 0;
    const aggregate: QueueCounts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };

    for (const queue of this.queues.values()) {
      queueCount += 1;
      const counts = await queue.getJobCounts();
      aggregate.waiting += counts.waiting ?? 0;
      aggregate.active += counts.active ?? 0;
      aggregate.delayed += counts.delayed ?? 0;
      aggregate.completed += counts.completed ?? 0;
      aggregate.failed += counts.failed ?? 0;
    }

    return { status: 'ok', queueCount, jobCounts: aggregate, failedJobs: aggregate.failed };
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].map(async (queue) => {
        try {
          await queue.close();
        } catch (error) {
          this.logger.warn?.('Failed to close queue', queue.name, error);
        }
      }),
    );
  }

  private ensureQueue(name: string, jobOptions?: JobsOptions): QueueLike {
    if (this.queues.has(name)) return this.queues.get(name)!;

    const redis = resolveRedisDiscovery(this.redisOptions);
    if (redis.disabled) {
      const queue = new InMemoryQueue(name, this.events, this.logger, this.concurrency);
      this.queues.set(name, queue);
      return queue;
    }

    const bundle: QueueBundle = createQueueBundle({
      name,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, ...this.defaultJobOptions, ...jobOptions },
      redis: this.redisOptions,
    });

    if (bundle.scheduler) {
      bundle.scheduler.waitUntilReady().catch((error: unknown) => {
        this.logger.warn?.(`Queue scheduler for ${name} failed to start`, error);
      });
    }

    if (bundle.events) {
      const listeners: Partial<QueueEventsListener> = {
        completed: (payload: any) => this.events.emit('completed', { ...payload, queueName: name }),
        failed: (payload: any) => this.events.emit('failed', { ...payload, queueName: name }),
        stalled: (payload: any) => this.events.emit('stalled', { ...payload, queueName: name }),
      };
      for (const [event, handler] of Object.entries(listeners)) {
        bundle.events.on(event as any, handler as any);
      }
    }

    this.queues.set(name, bundle.queue);
    return bundle.queue;
  }

  private async loadJobs(queueNames: Set<string>): Promise<void> {
    const files = await this.scanDir(this.jobsDir);
    for (const file of files) {
      try {
        const mod = await import(file);
        const register = (mod.registerJob || mod.default?.registerJob || mod.default) as
          | ((service: QueueService) => void)
          | undefined;
        if (typeof register === 'function') register(this);
        const inferred = mod.job ?? mod.default?.job;
        if (inferred?.queueName) queueNames.add(inferred.queueName as string);
      } catch (error) {
        this.logger.warn?.(`Failed to load job from ${file}:`, error);
      }
    }
  }

  private async loadWorkers(): Promise<void> {
    const files = await this.scanDir(this.workersDir);
    for (const file of files) {
      try {
        const mod = await import(file);
        const register = (mod.registerWorker || mod.default) as ((service: QueueService) => unknown) | undefined;
        if (typeof register === 'function') {
          await register(this);
        }
      } catch (error) {
        this.logger.warn?.(`Failed to load worker from ${file}:`, error);
      }
    }
  }

  private async scanDir(targetDir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
          const nested = await this.scanDir(fullPath);
          files.push(...nested);
        } else if (/\.(cjs|mjs|js|ts)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
      return files;
    } catch {
      return [];
    }
  }
}
