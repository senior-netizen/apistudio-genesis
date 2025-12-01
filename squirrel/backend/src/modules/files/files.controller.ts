import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';

@ApiTags('files')
@Controller({ path: 'files', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Roles(WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('sign')
  async sign(@Body() body: { workspaceId: string; name: string; contentType: string; sizeBytes: number }) {
    return this.files.createSignedUrl(body.workspaceId, body.name, body.contentType, body.sizeBytes);
  }
}
