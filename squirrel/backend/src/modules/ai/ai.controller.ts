import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';

type RepoSyncStartDto = {
  provider: string;
  workspaceId: string;
  redirectUri: string;
};

type RepoSyncCallbackDto = {
  provider: string;
  workspaceId: string;
  code: string;
  state: string;
};

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Roles(WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('generate-docs')
  generateDocs(@Body() body: Record<string, unknown>) {
    return this.ai.enqueue('generate-docs', body);
  }

  @Roles(WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('generate-tests')
  generateTests(@Body() body: Record<string, unknown>) {
    return this.ai.enqueue('generate-tests', body);
  }

  @Roles(WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('explain')
  explain(@Body() body: Record<string, unknown>) {
    return this.ai.enqueue('explain', body);
  }

  @Roles(WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('repo-sync/oauth/start')
  startRepoSyncOauth(@Req() req: any, @Body() body: RepoSyncStartDto) {
    return this.ai.createRepoSyncAuthorizationUrl({
      provider: body.provider,
      workspaceId: body.workspaceId,
      redirectUri: body.redirectUri,
      userId: req.user.id,
    });
  }

  @Roles(WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('repo-sync/oauth/callback')
  handleRepoSyncOauthCallback(@Req() req: any, @Body() body: RepoSyncCallbackDto) {
    return this.ai.handleRepoSyncOauthCallback({
      provider: body.provider,
      workspaceId: body.workspaceId,
      code: body.code,
      state: body.state,
      userId: req.user.id,
    });
  }
}
