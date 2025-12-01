import { Injectable } from '@nestjs/common';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

@Injectable()
export class AiService {
  constructor(private readonly queues: QueueService) {}

  async enqueue(task: string, payload: Record<string, unknown>) {
    const queue = this.queues.getQueue(QUEUES.AI_GENERATE);
    const job = await queue.add(task, payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return { jobId: job.id };
  }
}
