import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { EnvHelperDto } from './dto/env-helper.dto';
import { EnvHelperService } from './env-helper.service';

@ApiTags('ai-env-helper')
@Controller('env-helper')
export class EnvHelperController {
  constructor(private readonly envHelperService: EnvHelperService) {}

  @Post()
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Suggest environment variables for API calls.' })
  suggest(@Body() dto: EnvHelperDto) {
    return this.envHelperService.suggest(dto);
  }
}
