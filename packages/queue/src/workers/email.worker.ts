import { emailJob } from '../jobs/email.job';
import { type QueueService } from '../queue.service';

export const registerWorker = async (queue: QueueService) => {
  await queue.createWorker(emailJob, async (job) => {
    queue.events.emit('progress', { jobId: job.id, queueName: emailJob.queueName });
    queue.events.emit('log', { message: `Email queued for ${job.data.to}` });
  });
};
