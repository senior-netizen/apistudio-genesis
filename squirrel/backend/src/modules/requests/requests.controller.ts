import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('requests')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('collections/:collectionId/requests')
  async list(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: { id: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.requests.list(collectionId, user.id, parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Post('collections/:collectionId/requests')
  async create(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRequestDto,
  ) {
    return this.requests.create(collectionId, user.id, dto);
  }

  @Patch('requests/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requests.update(id, user.id, dto);
  }

  @Delete('requests/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.requests.delete(id, user.id);
  }

  @Post('requests/:id/run')
  async run(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.requests.run(id, user.id);
  }

  @Get('requests/:id/history')
  async history(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.requests.history(id, user.id, parseInt(page, 10), parseInt(pageSize, 10));
  }
}
