import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AcceptMagicInviteDto } from './dto/accept-magic-invite.dto';
import { WorkspacesService } from './workspaces.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('invites')
@Controller({ path: 'invites/magic', version: '1' })
export class MagicInvitesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post('accept')
  async accept(
    @Body() dto: AcceptMagicInviteDto,
    @CurrentUser() user?: { id: string; email?: string; displayName?: string },
  ) {
    return this.workspaces.acceptMagicInvite(dto, user);
  }
}
