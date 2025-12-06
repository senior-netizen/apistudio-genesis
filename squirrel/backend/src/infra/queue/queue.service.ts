import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import { QueueService as SharedQueueService, type RegisteredJob, type JobsOptions } from '@squirrel/queue';
import { RedisService } from '../redis/redis.service';
import appConfig from '../../config/configuration';
import { ConfigType } from '@nestjs/config';
import { MetricsService } from '../metrics/metrics.service';
import { QUEUES, type QueueName } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly manager: SharedQueueService;

  constructor(
    private readonly redisService: RedisService,
    private readonly metrics: MetricsService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {
    const redisEnabled = this.config.redis.enabled;
    this.manager = new SharedQueueService({
      queueNames: Object.values(QUEUES),
      logger: this.logger,
      concurrency: Number(process.env.QUEUE_CONCURRENCY ?? 5),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
      jobsDir: path.join(__dirname, '../../jobs'),
      workersDir: path.join(__dirname, '../../workers'),
      redis: {
        enabled: redisEnabled,
        url: this.config.redis.url,
        createClient: redisEnabled ? (scope?: string) => this.redisService.duplicate(scope ?? 'queue') : undefined,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.manager.init();
    const updateDepth = async (queueName: string) => {
      try {
        const counts = await this.manager.getQueue(queueName).getJobCounts();
        const depth = (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0);
        this.metrics.queueDepth.labels(queueName).set(depth);
      } catch (error) {
        this.logger.warn(`Failed to update queue depth for ${queueName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    for (const queueName of Object.values(QUEUES)) {
      await updateDepth(queueName);
    }

    this.manager.events.on('completed', (payload) => void updateDepth((payload as any).queueName as string));
    this.manager.events.on('failed', (payload) => void updateDepth((payload as any).queueName as string));
    this.manager.events.on('stalled', (payload) => void updateDepth((payload as any).queueName as string));
  }

  getQueue(name: QueueName) {
    return this.manager.getQueue(name);
  }

  async addJob<T>(queueName: QueueName, jobName: string, data: T, options?: JobsOptions) {
    const job: RegisteredJob<T> = { name: jobName, queueName };
    return this.manager.addJob(job, data, options);
  }

  async getHealth() {
    return this.manager.getHealth();
  }

  async onModuleDestroy() {
    await this.manager.close();
  }
}
