import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AlertService } from './alert.service';
import { QUEUES } from '../../infra/queue/queue.constants';

interface MonitorExecutionJob {
    monitorId: string;
    requestId: string;
    region: string;
}

@Processor(QUEUES.MONITOR_EXECUTE)
@Injectable()
export class MonitorExecutorService {
    private readonly logger = new Logger(MonitorExecutorService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly alerts: AlertService,
    ) { }

    @Process('execute')
    async executeMonitor(job: Job<MonitorExecutionJob>) {
        const { monitorId, requestId, region } = job.data;
        const startTime = Date.now();

        this.logger.log(`Executing monitor ${monitorId} in region ${region}`);

        try {
            // Get request details
            const request = await this.prisma.request.findUnique({
                where: { id: requestId },
            });

            if (!request) {
                throw new Error('Request not found');
            }

            // Execute request
            const response = await fetch(request.url, {
                method: request.method,
                headers: typeof request.headers === 'object' ? request.headers as any : {},
                body: request.body ? JSON.stringify(request.body) : undefined,
            });

            const responseTime = Date.now() - startTime;
            const statusCode = response.status;
            const success = statusCode >= 200 && statusCode < 400;

            // Record run
            await this.prisma.monitorRun.create({
                data: {
                    monitorId,
                    status: success ? 'success' : 'failure',
                    statusCode,
                    responseTime,
                    region,
                    errorMessage: success ? null : `HTTP ${statusCode}`,
                    executedAt: new Date(),
                },
            });

            // Send alert if failure
            if (!success) {
                const monitor = await this.prisma.monitor.findUnique({
                    where: { id: monitorId },
                    include: { request: true },
                });

                if (monitor?.alertOnFailure) {
                    await this.alerts.sendFailureAlert(monitor, {
                        statusCode,
                        responseTime,
                        region,
                        error: `HTTP ${statusCode}`,
                    });
                }
            }

            this.logger.log(
                `Monitor ${monitorId} completed: ${success ? 'SUCCESS' : 'FAILURE'} (${responseTime}ms)`,
            );
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.logger.error(`Monitor ${monitorId} failed:`, errorMessage);

            // Record failure
            await this.prisma.monitorRun.create({
                data: {
                    monitorId,
                    status: 'failure',
                    statusCode: null,
                    responseTime,
                    region,
                    errorMessage,
                    executedAt: new Date(),
                },
            });

            // Send alert
            const monitor = await this.prisma.monitor.findUnique({
                where: { id: monitorId },
                include: { request: true },
            });

            if (monitor?.alertOnFailure) {
                await this.alerts.sendFailureAlert(monitor, {
                    statusCode: null,
                    responseTime,
                    region,
                    error: errorMessage,
                });
            }
        }
    }
}
