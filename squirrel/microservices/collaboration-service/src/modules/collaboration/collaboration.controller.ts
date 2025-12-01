import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { InviteDto, ShareLinkDto, ScheduleSessionDto, CommentDto } from './dto';

@Controller('workspaces/:workspaceId')
export class CollaborationController {
  constructor(private readonly collab: CollaborationService) {}

  @Get('state')
  getState(@Param('workspaceId') workspaceId: string) {
    return this.collab.getState(workspaceId);
  }

  @Post('invites')
  createInvite(@Param('workspaceId') workspaceId: string, @Body() payload: InviteDto) {
    return this.collab.createInvite(workspaceId, payload);
  }

  @Patch('invites/:inviteId/revoke')
  revokeInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string) {
    return this.collab.revokeInvite(workspaceId, inviteId);
  }

  @Post('share-links')
  createShareLink(@Param('workspaceId') workspaceId: string, @Body() payload: ShareLinkDto) {
    return this.collab.createShareLink(workspaceId, payload);
  }

  @Patch('share-links/:linkId/revoke')
  revokeShareLink(@Param('workspaceId') workspaceId: string, @Param('linkId') linkId: string) {
    return this.collab.revokeShareLink(workspaceId, linkId);
  }

  @Post('sessions')
  scheduleSession(@Param('workspaceId') workspaceId: string, @Body() payload: ScheduleSessionDto) {
    return this.collab.scheduleSession(workspaceId, payload);
  }

  @Patch('sessions/:sessionId/start')
  startSession(@Param('workspaceId') workspaceId: string, @Param('sessionId') sessionId: string) {
    return this.collab.startSession(workspaceId, sessionId);
  }

  @Patch('sessions/:sessionId/end')
  endSession(@Param('workspaceId') workspaceId: string, @Param('sessionId') sessionId: string) {
    return this.collab.endSession(workspaceId, sessionId);
  }

  @Post('comments')
  addComment(@Param('workspaceId') workspaceId: string, @Body() payload: CommentDto) {
    return this.collab.addComment(workspaceId, payload);
  }

  @Get('activity')
  getActivity(@Param('workspaceId') workspaceId: string) {
    return this.collab.getActivity(workspaceId);
  }
}
