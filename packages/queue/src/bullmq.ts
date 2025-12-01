import { EventEmitter } from 'events';

let bullmq: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  bullmq = require('bullmq');
} catch {
  class FakeQueue<T = unknown> {
    name: string;
    constructor(name: string, _options?: any) {
      this.name = name;
    }
    async add(name: string, data: T, _opts?: any) {
      return { id: `${Date.now()}`, name, data } as const;
    }
    async getJobCounts() {
      return { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 } as const;
    }
    async close() {}
  }

  class FakeScheduler {
    constructor(public readonly name: string) {}
    async waitUntilReady() {}
  }

  class FakeWorker {
    constructor(public readonly name: string, _processor: any) {
      setImmediate(() => undefined);
    }
    on() {}
  }

  class FakeQueueEvents extends EventEmitter {}

  bullmq = { Queue: FakeQueue, QueueScheduler: FakeScheduler, QueueEvents: FakeQueueEvents, Worker: FakeWorker };
}

export type QueueCounts = { waiting: number; active: number; delayed: number; completed: number; failed: number };
export type JobsOptions = Record<string, unknown>;
export type WorkerOptions = Record<string, unknown>;
export type QueueEventsListener = {
  completed?: (payload: unknown) => void;
  failed?: (payload: unknown) => void;
  stalled?: (payload: unknown) => void;
};
export type Processor<T = unknown, R = unknown> = (job: any) => Promise<R> | R;

export type QueueInstance<T = unknown> = {
  name: string;
  add: (name: string, data: T, opts?: JobsOptions) => Promise<any>;
  getJobCounts: () => Promise<QueueCounts>;
  close: () => Promise<void>;
};

export type QueueConstructor = new <T = unknown>(name: string, options?: any) => QueueInstance<T>;

export type WorkerInstance<T = unknown> = {
  on: (event: string, handler: (...args: any[]) => void) => void;
};

export type WorkerConstructor = new <T = unknown, R = unknown, N extends string = string>(
  name: string,
  processor: Processor<T, R>,
  options?: WorkerOptions,
) => WorkerInstance<T>;

export type QueueSchedulerInstance = { waitUntilReady: () => Promise<void> };
export type QueueSchedulerConstructor = new (name: string, options?: any) => QueueSchedulerInstance;

export type QueueEventsInstance = EventEmitter;
export type QueueEventsConstructor = new (name: string, options?: any) => QueueEventsInstance;

export const Queue = bullmq.Queue as QueueConstructor;
export const QueueEvents = bullmq.QueueEvents as QueueEventsConstructor;
export const QueueScheduler = bullmq.QueueScheduler as QueueSchedulerConstructor;
export const Worker = bullmq.Worker as WorkerConstructor;

export type QueueBaseOptions = any;
