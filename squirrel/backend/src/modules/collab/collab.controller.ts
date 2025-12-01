import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CollaborationDataService } from './services/collaboration-data.service';

@Controller('collab/workspaces/:workspaceId')
export class CollabController {
  constructor(private readonly data: CollaborationDataService) {}

  @Get('state')
  getState(@Param('workspaceId') workspaceId: string) {
    return this.data.getState(workspaceId);
  }

  @Post('invites')
  createInvite(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: { email: string; role: string; message?: string; invitedBy?: string },
  ) {
    return this.data.createInvite(workspaceId, body);
  }

  @Patch('invites/:inviteId/revoke')
  revokeInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string) {
    return this.data.revokeInvite(workspaceId, inviteId);
  }

  @Post('share-links')
  createShareLink(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: { label: string; scope: 'workspace' | 'collection'; expiresInHours?: number; requiresApproval?: boolean; maxUses?: number },
  ) {
    return this.data.createShareLink(workspaceId, body);
  }

  @Patch('share-links/:linkId/revoke')
  revokeShareLink(@Param('workspaceId') workspaceId: string, @Param('linkId') linkId: string) {
    return this.data.revokeShareLink(workspaceId, linkId);
  }

  @Post('sessions')
  scheduleSession(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { title: string; hostId: string; scheduledAt: string; timezone: string; agenda: string },
  ) {
    return this.data.scheduleSession(workspaceId, body);
  }

  @Patch('sessions/:sessionId/start')
  startSession(@Param('workspaceId') workspaceId: string, @Param('sessionId') sessionId: string) {
    return this.data.startSession(workspaceId, sessionId);
  }

  @Patch('sessions/:sessionId/end')
  endSession(@Param('workspaceId') workspaceId: string, @Param('sessionId') sessionId: string) {
    return this.data.endSession(workspaceId, sessionId);
  }

  @Post('comments')
  addComment(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { userId: string; userName?: string; message: string },
  ) {
    return this.data.addComment(workspaceId, body);
  }

  @Get('activity')
  getActivity(@Param('workspaceId') workspaceId: string) {
    return this.data.getActivity(workspaceId);
  }
}
