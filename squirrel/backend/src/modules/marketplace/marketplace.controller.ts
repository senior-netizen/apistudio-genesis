import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { PublishApiDto } from './dto/publish-api.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscribeDto } from './dto/subscribe.dto';
import { RevokeKeyDto } from './dto/revoke-key.dto';

@ApiTags('marketplace')
@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  async list(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.marketplace.list(parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Get(':apiId')
  async get(@Param('apiId') apiId: string) {
    return this.marketplace.get(apiId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('publish')
  async publish(@CurrentUser() user: { id: string }, @Body() dto: PublishApiDto) {
    return this.marketplace.publish(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':apiId/subscribe')
  async subscribe(
    @CurrentUser() user: { id: string },
    @Param('apiId') apiId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.marketplace.subscribe(user.id, apiId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':apiId/keys')
  async keys(@CurrentUser() user: { id: string }, @Param('apiId') apiId: string) {
    return this.marketplace.listKeys(apiId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('keys/revoke')
  async revoke(@CurrentUser() user: { id: string }, @Body() dto: RevokeKeyDto) {
    return this.marketplace.revokeKey(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':apiId/analytics')
  async analytics(@CurrentUser() user: { id: string }, @Param('apiId') apiId: string) {
    return this.marketplace.analytics(apiId, user.id);
  }
}
