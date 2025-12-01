import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../shared/roles.decorator';
import { OrganizationRole } from '../../shared/constants/organization-roles';

@Controller('organizations/:orgId/teams')
@UseGuards(RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  create(@Param('orgId') organizationId: string, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(organizationId, dto);
  }

  @Get()
  list(@Param('orgId') organizationId: string) {
    return this.teamsService.listForOrganization(organizationId);
  }

  @Patch(':teamId')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  update(
    @Param('orgId') organizationId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    void organizationId;
    return this.teamsService.updateTeam(teamId, dto);
  }
}
