import { Controller, All, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { MockRuntimeService } from './mock-runtime.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Controller('mock')
export class MockProxyController {
    constructor(
        private readonly runtime: MockRuntimeService,
        private readonly prisma: PrismaService,
    ) { }

    @All(':mockId/*')
    async handleMockRequest(
        @Param('mockId') mockId: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            // Get mock server
            const mockServer = await this.prisma.mockServer.findUnique({
                where: { baseUrl: `mock-${mockId}` },
            });

            if (!mockServer) {
                return res.status(404).json({
                    error: 'Mock server not found',
                    mockId,
                });
            }

            if (!mockServer.enabled) {
                return res.status(503).json({
                    error: 'Mock server is disabled',
                    mockId,
                });
            }

            // Extract path (remove /mock/:mockId prefix)
            const fullPath = req.path;
            const pathWithoutPrefix = fullPath.replace(`/mock/${mockId}`, '') || '/';

            // Find matching route
            const match = await this.runtime.findMatchingRoute(
                mockServer.id,
                req.method,
                pathWithoutPrefix,
                req.query as Record<string, string>,
                req.headers as Record<string, string>,
            );

            if (!match) {
                return res.status(404).json({
                    error: 'No matching route found',
                    method: req.method,
                    path: pathWithoutPrefix,
                    availableRoutes: 'Use GET /mock-servers/:id to see available routes',
                });
            }

            // Record hit
            await this.runtime.recordHit(match.route.id);

            // Apply delay if specified
            if (match.route.delay) {
                await new Promise((resolve) => setTimeout(resolve, match.route.delay!));
            }

            // Set custom headers
            if (match.route.responseHeaders) {
                Object.entries(match.route.responseHeaders).forEach(([key, value]) => {
                    res.setHeader(key, value as string);
                });
            }

            // Set default content-type if not specified
            if (!res.getHeader('content-type')) {
                res.setHeader('Content-Type', 'application/json');
            }

            // Send response
            res.status(match.route.statusCode).json(match.route.responseBody);
        } catch (error) {
            console.error('Mock request error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
