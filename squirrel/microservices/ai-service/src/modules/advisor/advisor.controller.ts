import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AdvisorService } from './advisor.service';
import { AdvisorRequestDto } from './dto/http-transaction.dto';

@ApiTags('ai-advisor')
@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  @Post()
  @Roles('free', 'paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Explain failing API requests and suggest fixes.' })
  analyze(@Body() dto: AdvisorRequestDto) {
    return this.advisorService.analyze(dto);
  }
}
