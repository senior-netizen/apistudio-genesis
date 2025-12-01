import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../shared/roles.decorator';
import { OrganizationRole } from '../../shared/constants/organization-roles';
import { RequestWithUser } from '../../common/types/request-with-user';

@Controller('organizations')
@UseGuards(RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  create(@Body() dto: CreateOrganizationDto, @Req() req: RequestWithUser) {
    const userId = req.user?.id ?? req.headers['x-user-id'];
    return this.organizationsService.createOrganization(dto, String(userId));
  }

  @Get()
  listAll() {
    return this.organizationsService.findAll();
  }

  @Get('me')
  listForCurrentUser(@Req() req: RequestWithUser) {
    const userId = req.user?.id ?? req.headers['x-user-id'];
    return this.organizationsService.listForUser(String(userId));
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateOrganization(id, dto);
  }
}
