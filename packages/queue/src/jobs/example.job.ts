import { type JobsOptions } from '../bullmq';
import { type QueueService, type RegisteredJob } from '../queue.service';

export type ExampleJobPayload = { message: string; delayMs?: number };

export const exampleJob: RegisteredJob<ExampleJobPayload> = {
  name: 'example',
  queueName: 'examples',
  defaultOptions: {
    attempts: 2,
    removeOnComplete: true,
  },
};

export const registerExampleJob = (queue: QueueService): void => {
  queue.registerJob(exampleJob);
};

export const enqueueExample = async (
  queue: QueueService,
  payload: ExampleJobPayload,
  options?: JobsOptions,
) => queue.addJob(exampleJob, payload, { delay: payload.delayMs, ...options });
