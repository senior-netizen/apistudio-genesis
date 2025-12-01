/**
 * Use redis-mock to avoid networked Redis during integration-style tests. If the dependency
 * is unavailable in the current environment, fall back to a lightweight stub.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const redisMock = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('redis-mock');
  } catch {
    return { createClient: () => ({ quit: async () => undefined }) };
  }
})();

jest.mock('ioredis', () => redisMock);

import { QueueService, type RegisteredJob } from '@squirrel/queue';

describe('QueueService (integration)', () => {
  beforeEach(() => {
    process.env.REDIS_DISABLED = 'true';
    process.env.NODE_ENV = 'test';
  });

  it('retries failed jobs and emits lifecycle events', async () => {
    const queueService = new QueueService({ queueNames: ['test.queue'], redis: { enabled: false }, enableWorkers: true });
    await queueService.init();

    const job: RegisteredJob<{ id: string }> = {
      name: 'retry-job',
      queueName: 'test.queue',
      defaultOptions: { attempts: 2, backoff: { type: 'fixed', delay: 5 } },
    };

    let runs = 0;
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    queueService.events.on('failed', (event) => failures.push(event));
    queueService.events.on('completed', (event) => completions.push(event));

    await queueService.createWorker(job, async () => {
      runs += 1;
      if (runs < 2) {
        throw new Error('fail first attempt');
      }
    });

    await queueService.addJob(job, { id: 'abc' });

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(runs).toBe(2);
    expect(failures.length).toBeGreaterThan(0);
    expect(completions).toHaveLength(1);

    await queueService.close();
  });
});
