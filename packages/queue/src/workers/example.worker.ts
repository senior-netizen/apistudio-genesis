import { exampleJob } from '../jobs/example.job';
import { type QueueService } from '../queue.service';

export const registerWorker = async (queue: QueueService) => {
  await queue.createWorker(exampleJob, async (job) => {
    queue.events.emit('log', { message: `Processing example job: ${job.data.message}` });
  });
};
