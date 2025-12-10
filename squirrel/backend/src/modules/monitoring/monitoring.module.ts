import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorExecutorService } from './monitor-executor.service';
import { AlertService } from './alert.service';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { QueueModule } from '../../infra/queue/queue.module';

@Module({
    imports: [PrismaModule, QueueModule],
    controllers: [MonitoringController],
    providers: [
        MonitoringService,
        MonitorSchedulerService,
        MonitorExecutorService,
        AlertService,
    ],
    exports: [MonitoringService],
})
export class MonitoringModule { }
