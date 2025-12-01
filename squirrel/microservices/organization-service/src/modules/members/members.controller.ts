import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../shared/roles.decorator';
import { OrganizationRole } from '../../shared/constants/organization-roles';

@Controller('organizations/:orgId/members')
@UseGuards(RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Param('orgId') organizationId: string) {
    return this.membersService.listMembers(organizationId);
  }

  @Post()
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  add(@Param('orgId') organizationId: string, @Body() dto: AddMemberDto) {
    return this.membersService.addMember(organizationId, dto);
  }

  @Patch(':memberId/role')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  updateRole(@Param('memberId') memberId: string, @Body() dto: UpdateMemberRoleDto) {
    return this.membersService.updateMemberRole(memberId, dto);
  }

  @Delete(':memberId')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  remove(@Param('memberId') memberId: string) {
    return this.membersService.removeMember(memberId);
  }
}
