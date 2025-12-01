import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('collections')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get('workspaces/:workspaceId/collections')
  async list(@Param('workspaceId') workspaceId: string, @CurrentUser() user: { id: string }) {
    return this.collections.list(workspaceId, user.id);
  }

  @Post('workspaces/:workspaceId/collections')
  async create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collections.create(workspaceId, user.id, dto);
  }

  @Patch('collections/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collections.update(id, user.id, dto);
  }

  @Delete('collections/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.collections.remove(id, user.id);
  }
}
