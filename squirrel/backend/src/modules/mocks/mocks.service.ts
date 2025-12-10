import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CacheService } from '../../infra/cache/cache.service';

@Injectable()
export class MocksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) { }

    async createMockServer(workspaceId: string, userId: string, data: { name: string; baseUrl?: string }) {
        // Verify workspace ownership
        await this.verifyWorkspaceOwnership(workspaceId, userId);

        // Generate unique base URL if not provided
        const baseUrl = data.baseUrl || this.generateMockUrl();

        const mockServer = await this.prisma.mockServer.create({
            data: {
                workspaceId,
                name: data.name,
                baseUrl,
                enabled: true,
            },
        });

        await this.invalidateCache(workspaceId);
        return mockServer;
    }

    async listMockServers(workspaceId: string, userId: string) {
        await this.verifyWorkspaceOwnership(workspaceId, userId);

        const cacheKey = `mocks:${workspaceId}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const mockServers = await this.prisma.mockServer.findMany({
            where: { workspaceId },
            include: {
                routes: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        await this.cache.set(cacheKey, mockServers, 60);
        return mockServers;
    }

    async getMockServer(id: string, userId: string) {
        const mockServer = await this.prisma.mockServer.findUnique({
            where: { id },
            include: {
                routes: {
                    orderBy: { createdAt: 'asc' },
                },
                workspace: {
                    select: { ownerId: true },
                },
            },
        });

        if (!mockServer || mockServer.workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'MOCK_SERVER_NOT_FOUND',
                message: 'Mock server not found',
            });
        }

        return mockServer;
    }

    async updateMockServer(id: string, userId: string, data: { name?: string; enabled?: boolean }) {
        const existing = await this.getMockServer(id, userId);

        const updated = await this.prisma.mockServer.update({
            where: { id },
            data: {
                name: data.name ?? existing.name,
                enabled: data.enabled ?? existing.enabled,
            },
        });

        await this.invalidateCache(existing.workspaceId);
        return updated;
    }

    async deleteMockServer(id: string, userId: string) {
        const existing = await this.getMockServer(id, userId);

        await this.prisma.mockServer.delete({
            where: { id },
        });

        await this.invalidateCache(existing.workspaceId);
        return { status: 'deleted' };
    }

    async addRoute(
        mockServerId: string,
        userId: string,
        data: {
            method: string;
            path: string;
            statusCode?: number;
            responseBody: any;
            responseHeaders?: Record<string, string>;
            delay?: number;
        },
    ) {
        const mockServer = await this.getMockServer(mockServerId, userId);

        // Validate method
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
        if (!validMethods.includes(data.method.toUpperCase())) {
            throw new BadRequestException({
                code: 'INVALID_METHOD',
                message: 'Invalid HTTP method',
            });
        }

        const route = await this.prisma.mockRoute.create({
            data: {
                mockServerId,
                method: data.method.toUpperCase(),
                path: data.path,
                statusCode: data.statusCode || 200,
                responseBody: data.responseBody,
                responseHeaders: data.responseHeaders || null,
                delay: data.delay || null,
            },
        });

        await this.invalidateCache(mockServer.workspaceId);
        await this.cache.del(`mock:${mockServerId}`);

        return route;
    }

    async deleteRoute(routeId: string, userId: string) {
        const route = await this.prisma.mockRoute.findUnique({
            where: { id: routeId },
            include: {
                mockServer: {
                    include: {
                        workspace: { select: { ownerId: true } },
                    },
                },
            },
        });

        if (!route || route.mockServer.workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'ROUTE_NOT_FOUND',
                message: 'Route not found',
            });
        }

        await this.prisma.mockRoute.delete({
            where: { id: routeId },
        });

        await this.invalidateCache(route.mockServer.workspaceId);
        await this.cache.del(`mock:${route.mockServerId}`);

        return { status: 'deleted' };
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

        return workspace;
    }

    private generateMockUrl(): string {
        // Generate unique mock URL
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `mock-${timestamp}-${random}`;
    }

    private async invalidateCache(workspaceId: string) {
        await this.cache.delPrefix(`mocks:${workspaceId}`);
    }
}
