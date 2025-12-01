import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';

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
}
