import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('environments')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Get('workspaces/:workspaceId/environments')
  async list(@Param('workspaceId') workspaceId: string, @CurrentUser() user: { id: string }) {
    return this.environments.list(workspaceId, user.id);
  }

  @Post('workspaces/:workspaceId/environments')
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateEnvironmentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.environments.create(workspaceId, user.id, dto);
  }

  @Patch('environments/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.environments.update(id, user.id, dto);
  }

  @Delete('environments/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.environments.delete(id, user.id);
  }
}
