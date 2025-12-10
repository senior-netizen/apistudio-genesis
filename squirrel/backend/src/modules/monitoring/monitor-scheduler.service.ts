import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

@Injectable()
export class MonitorSchedulerService {
    private readonly logger = new Logger(MonitorSchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly queues: QueueService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledMonitors() {
        this.logger.debug('Checking for scheduled monitors...');

        try {
            // Get all enabled monitors
            const monitors = await this.prisma.monitor.findMany({
                where: { enabled: true },
                include: { request: true },
            });

            for (const monitor of monitors) {
                if (await this.shouldExecute(monitor.id, monitor.schedule)) {
                    this.logger.log(`Queueing monitor execution: ${monitor.name}`);

                    // Queue execution for each region
                    const queue = this.queues.getQueue(QUEUES.MONITOR_EXECUTE);

                    for (const region of monitor.regions) {
                        await queue.add('execute', {
                            monitorId: monitor.id,
                            requestId: monitor.requestId,
                            region,
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error checking scheduled monitors:', error);
        }
    }

    private async shouldExecute(monitorId: string, schedule: string): Promise<boolean> {
        // Get last run
        const lastRun = await this.prisma.monitorRun.findFirst({
            where: { monitorId },
            orderBy: { executedAt: 'desc' },
        });

        // Parse cron schedule
        const now = new Date();
        const match = this.matchesCronSchedule(schedule, now);

        if (!match) {
            return false;
        }

        // If we have a last run, check if enough time has passed
        if (lastRun) {
            const timeSinceLastRun = now.getTime() - lastRun.executedAt.getTime();
            // Don't execute more than once per minute
            if (timeSinceLastRun < 60000) {
                return false;
            }
        }

        return true;
    }

    private matchesCronSchedule(schedule: string, date: Date): boolean {
        // Simple cron matching (minute hour day month weekday)
        const parts = schedule.split(/\s+/);
        if (parts.length !== 5) return false;

        const [minute, hour, day, month, weekday] = parts;

        const currentMinute = date.getMinutes();
        const currentHour = date.getHours();
        const currentDay = date.getDate();
        const currentMonth = date.getMonth() + 1;
        const currentWeekday = date.getDay();

        return (
            this.matchField(minute, currentMinute, 0, 59) &&
            this.matchField(hour, currentHour, 0, 23) &&
            this.matchField(day, currentDay, 1, 31) &&
            this.matchField(month, currentMonth, 1, 12) &&
            this.matchField(weekday, currentWeekday, 0, 6)
        );
    }

    private matchField(pattern: string, value: number, min: number, max: number): boolean {
        // Match * (any)
        if (pattern === '*') return true;

        // Match specific value
        if (pattern === value.toString()) return true;

        // Match */n (every n)
        if (pattern.startsWith('*/')) {
            const step = parseInt(pattern.substring(2));
            return value % step === 0;
        }

        // Match range (e.g., 1-5)
        if (pattern.includes('-')) {
            const [start, end] = pattern.split('-').map((n) => parseInt(n));
            return value >= start && value <= end;
        }

        // Match list (e.g., 1,3,5)
        if (pattern.includes(',')) {
            const values = pattern.split(',').map((n) => parseInt(n));
            return values.includes(value);
        }

        return false;
    }
}
