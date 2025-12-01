import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../shared/roles.decorator';
import { OrganizationRole } from '../../shared/constants/organization-roles';
import { RequestWithUser } from '../../common/types/request-with-user';

@Controller('organizations')
@UseGuards(RolesGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post(':orgId/invites')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  createInvite(
    @Param('orgId') orgId: string,
    @Body() dto: CreateInviteDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id ?? req.headers['x-user-id'];
    return this.invitesService.createInvite(orgId, dto, String(userId));
  }

  @Get('invite/:token')
  getByToken(@Param('token') token: string) {
    return this.invitesService.getInviteByToken(token);
  }

  @Post('invite/accept')
  accept(@Body() dto: AcceptInviteDto) {
    return this.invitesService.acceptInvite(dto);
  }
}
