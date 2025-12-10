import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('monitoring')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class MonitoringController {
    constructor(private readonly monitoring: MonitoringService) { }

    @Post('workspaces/:workspaceId/monitors')
    async createMonitor(
        @Param('workspaceId') workspaceId: string,
        @CurrentUser() user: { id: string },
        @Body() data: {
            requestId: string;
            name: string;
            schedule: string;
            regions?: string[];
            alertOnFailure?: boolean;
            alertChannels?: any;
        },
    ) {
        return this.monitoring.createMonitor(workspaceId, user.id, data);
    }

    @Get('workspaces/:workspaceId/monitors')
    async listMonitors(
        @Param('workspaceId') workspaceId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.monitoring.listMonitors(workspaceId, user.id);
    }

    @Get('monitors/:id')
    async getMonitor(
        @Param('id') id: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.monitoring.getMonitor(id, user.id);
    }

    @Patch('monitors/:id')
    async updateMonitor(
        @Param('id') id: string,
        @CurrentUser() user: { id: string },
        @Body() data: {
            name?: string;
            schedule?: string;
            enabled?: boolean;
            alertOnFailure?: boolean;
            alertChannels?: any;
        },
    ) {
        return this.monitoring.updateMonitor(id, user.id, data);
    }

    @Delete('monitors/:id')
    async deleteMonitor(
        @Param('id') id: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.monitoring.deleteMonitor(id, user.id);
    }

    @Post('monitors/:id/run')
    async triggerRun(
        @Param('id') id: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.monitoring.triggerManualRun(id, user.id);
    }

    @Get('monitors/:id/runs')
    async getRunHistory(
        @Param('id') id: string,
        @CurrentUser() user: { id: string },
        @Query('page') page = '1',
        @Query('pageSize') pageSize = '50',
    ) {
        return this.monitoring.getRunHistory(id, user.id, parseInt(page), parseInt(pageSize));
    }
}
