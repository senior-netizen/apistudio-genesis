import { Controller, Get } from '@nestjs/common';
import { QueueService } from '../../infra/queue/queue.service';

@Controller()
export class QueueHealthController {
  constructor(private readonly queues: QueueService) {}

  @Get('/queues/health')
  async getHealth() {
    return this.queues.getHealth();
  }
}
