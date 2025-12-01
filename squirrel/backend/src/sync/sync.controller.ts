import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncHandshakeDto } from './dto/handshake.dto';
import { SyncPullDto } from './dto/pull.dto';
import { SyncPushDto } from './dto/push.dto';

@ApiTags('sync')
@Controller({ path: 'sync', version: '1' })
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('handshake')
  async handshake(@CurrentUser() user: { id: string }, @Body() dto: SyncHandshakeDto) {
    return this.sync.handshake(user, dto);
  }

  @Post('pull')
  async pull(@CurrentUser() user: { id: string }, @Body() dto: SyncPullDto) {
    return this.sync.pull(user, dto);
  }

  @Post('push')
  async push(@CurrentUser() user: { id: string }, @Body() dto: SyncPushDto) {
    return this.sync.push(user, dto);
  }

  @Get('presence')
  async presence(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) {
      return [];
    }
    return this.sync.listPresence(workspaceId);
  }
}
