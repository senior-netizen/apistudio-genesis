import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

@Injectable()
export class MonitoringService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly queues: QueueService,
    ) { }

    async createMonitor(
        workspaceId: string,
        userId: string,
        data: {
            requestId: string;
            name: string;
            schedule: string;
            regions?: string[];
            alertOnFailure?: boolean;
            alertChannels?: any;
        },
    ) {
        // Verify workspace and request ownership
        await this.verifyWorkspaceOwnership(workspaceId, userId);
        await this.verifyRequestOwnership(data.requestId, userId);

        // Validate cron schedule
        if (!this.isValidCronSchedule(data.schedule)) {
            throw new BadRequestException({
                code: 'INVALID_SCHEDULE',
                message: 'Invalid cron schedule format',
            });
        }

        const monitor = await this.prisma.monitor.create({
            data: {
                workspaceId,
                requestId: data.requestId,
                name: data.name,
                schedule: data.schedule,
                enabled: true,
                regions: data.regions || ['default'],
                alertOnFailure: data.alertOnFailure ?? true,
                alertChannels: data.alertChannels || null,
            },
        });

        return monitor;
    }

    async listMonitors(workspaceId: string, userId: string) {
        await this.verifyWorkspaceOwnership(workspaceId, userId);

        const monitors = await this.prisma.monitor.findMany({
            where: { workspaceId },
            include: {
                request: {
                    select: { name: true, method: true, url: true },
                },
                runs: {
                    take: 10,
                    orderBy: { executedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate uptime for each monitor
        const monitorsWithStats = await Promise.all(
            monitors.map(async (monitor: any) => {
                const stats = await this.calculateUptime(monitor.id);
                return {
                    ...monitor,
                    stats,
                };
            }),
        );

        return monitorsWithStats;
    }

    async getMonitor(id: string, userId: string) {
        const monitor = await this.prisma.monitor.findUnique({
            where: { id },
            include: {
                request: true,
                workspace: { select: { ownerId: true } },
            },
        });

        if (!monitor || monitor.workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'MONITOR_NOT_FOUND',
                message: 'Monitor not found',
            });
        }

        return monitor;
    }

    async updateMonitor(
        id: string,
        userId: string,
        data: {
            name?: string;
            schedule?: string;
            enabled?: boolean;
            alertOnFailure?: boolean;
            alertChannels?: any;
        },
    ) {
        const existing = await this.getMonitor(id, userId);

        // Validate schedule if provided
        if (data.schedule && !this.isValidCronSchedule(data.schedule)) {
            throw new BadRequestException({
                code: 'INVALID_SCHEDULE',
                message: 'Invalid cron schedule format',
            });
        }

        const updated = await this.prisma.monitor.update({
            where: { id },
            data: {
                name: data.name ?? existing.name,
                schedule: data.schedule ?? existing.schedule,
                enabled: data.enabled ?? existing.enabled,
                alertOnFailure: data.alertOnFailure ?? existing.alertOnFailure,
                alertChannels: data.alertChannels ?? existing.alertChannels,
            },
        });

        return updated;
    }

    async deleteMonitor(id: string, userId: string) {
        await this.getMonitor(id, userId);

        await this.prisma.monitor.delete({
            where: { id },
        });

        return { status: 'deleted' };
    }

    async triggerManualRun(id: string, userId: string) {
        const monitor = await this.getMonitor(id, userId);

        // Queue execution
        const queue = this.queues.getQueue(QUEUES.MONITOR_EXECUTE);
        await queue.add('execute', {
            monitorId: monitor.id,
            requestId: monitor.requestId,
            region: 'default',
        });

        return { status: 'queued' };
    }

    async getRunHistory(id: string, userId: string, page = 1, pageSize = 50) {
        await this.getMonitor(id, userId);

        const limit = Math.min(pageSize, 100);
        const skip = (page - 1) * limit;

        const [runs, total] = await this.prisma.$transaction([
            this.prisma.monitorRun.findMany({
                where: { monitorId: id },
                skip,
                take: limit,
                orderBy: { executedAt: 'desc' },
            }),
            this.prisma.monitorRun.count({
                where: { monitorId: id },
            }),
        ]);

        return {
            runs,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    private async calculateUptime(monitorId: string) {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const runs = await this.prisma.monitorRun.findMany({
            where: {
                monitorId,
                executedAt: {
                    gte: last24Hours,
                },
            },
        });

        if (runs.length === 0) {
            return {
                uptime: 100,
                totalRuns: 0,
                successfulRuns: 0,
                failedRuns: 0,
                avgResponseTime: 0,
            };
        }

        const successfulRuns = runs.filter((r: any) => r.status === 'success').length;
        const uptime = (successfulRuns / runs.length) * 100;
        const avgResponseTime =
            runs.reduce((sum: number, r: any) => sum + r.responseTime, 0) / runs.length;

        return {
            uptime: Math.round(uptime * 100) / 100,
            totalRuns: runs.length,
            successfulRuns,
            failedRuns: runs.length - successfulRuns,
            avgResponseTime: Math.round(avgResponseTime),
        };
    }

    private async verifyWorkspaceOwnership(workspaceId: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });

        if (!workspace || workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'WORKSPACE_NOT_FOUND',
                message: 'Workspace not found',
            });
        }
    }

    private async verifyRequestOwnership(requestId: string, userId: string) {
        const request = await this.prisma.request.findUnique({
            where: { id: requestId },
            select: {
                collection: {
                    select: {
                        workspace: { select: { ownerId: true } },
                    },
                },
            },
        });

        if (!request || request.collection.workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'REQUEST_NOT_FOUND',
                message: 'Request not found',
            });
        }
    }

    private isValidCronSchedule(schedule: string): boolean {
        // Basic cron validation (5 fields: minute hour day month weekday)
        const parts = schedule.trim().split(/\s+/);
        return parts.length === 5;
    }
}
