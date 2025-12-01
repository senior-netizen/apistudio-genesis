import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  async searchQuery(@CurrentUser() user: { id: string }, @Query('workspaceId') workspaceId: string, @Query('q') q: string) {
    return this.search.search(workspaceId, q);
  }
}
