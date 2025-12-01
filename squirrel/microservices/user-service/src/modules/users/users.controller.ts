import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller({ path: 'v1', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve user profile information' })
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/organizations')
  @ApiOperation({ summary: 'List organizations that the user belongs to' })
  listOrganizations(@Param('id') id: string) {
    return this.usersService.listOrganizations(id);
  }

  @Get(':id/organizations/primary')
  @ApiOperation({ summary: 'Retrieve the user\'s primary organization' })
  getPrimaryOrganization(@Param('id') id: string) {
    return this.usersService.getPrimaryOrganization(id);
  }

  @Post(':id/organizations/use/:orgId')
  @ApiOperation({ summary: 'Update the active organization for the user' })
  useOrganization(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.usersService.setActiveOrganization(id, orgId);
  }

  @Patch(':id/roles')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Update user roles with delegated validation' })
  updateRoles(@Param('id') id: string, @Body() payload: UpdateUserRoleDto) {
    return this.usersService.updateRoles(id, payload);
  }

  @Post(':id/badges/founder')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign founder badge using Redis event bus' })
  assignFounderBadge(@Param('id') id: string) {
    return this.usersService.assignFounderBadge(id);
  }
}
