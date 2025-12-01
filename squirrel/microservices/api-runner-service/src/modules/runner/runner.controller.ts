import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { ExecuteRequestDto } from './dto/execute-request.dto';
import { RunnerService } from './runner.service';

@ApiTags('runner')
@Controller({ path: 'v1', version: '1' })
export class RunnerController {
  constructor(private readonly runnerService: RunnerService) {}

  @Post('execute')
  @Roles('free', 'paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Execute an API request via centralized runner' })
  execute(@Body() payload: ExecuteRequestDto) {
    return this.runnerService.execute(payload);
  }
}
