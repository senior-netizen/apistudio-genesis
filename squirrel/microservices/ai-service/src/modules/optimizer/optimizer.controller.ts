import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { OptimizerDto } from './dto/optimizer.dto';
import { OptimizerService } from './optimizer.service';

@ApiTags('ai-optimizer')
@Controller('optimizer')
export class OptimizerController {
  constructor(private readonly optimizerService: OptimizerService) {}

  @Post()
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Suggest CORS and performance optimisations based on logs.' })
  suggest(@Body() dto: OptimizerDto) {
    return this.optimizerService.suggest(dto);
  }
}
