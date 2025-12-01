import { type JobsOptions } from '../bullmq';
import { type QueueService, type RegisteredJob } from '../queue.service';

export type EmailJobPayload = { to: string; subject: string; body: string };

export const emailJob: RegisteredJob<EmailJobPayload> = {
  name: 'sendEmail',
  queueName: 'email',
  defaultOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    priority: 1,
    removeOnComplete: true,
  },
};

export const registerEmailJob = (queue: QueueService): void => {
  queue.registerJob(emailJob);
};

export const enqueueEmail = async (
  queue: QueueService,
  payload: EmailJobPayload,
  options?: JobsOptions,
) => queue.addJob(emailJob, payload, options);
