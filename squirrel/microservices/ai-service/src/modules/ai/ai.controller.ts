import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { GenerateAdvisorResponseDto } from './dto/generate-advisor-response.dto';
import { GenerateComposerDto } from './dto/generate-composer.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller({ path: 'v1', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('advisor')
  @Roles('free', 'paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Generate AI advisor response' })
  generateAdvisor(@Body() payload: GenerateAdvisorResponseDto) {
    return this.aiService.generateAdvisorResponse(payload);
  }

  @Post('composer')
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Generate API composer output' })
  generateComposer(@Body() payload: GenerateComposerDto) {
    return this.aiService.generateComposerOutput(payload);
  }
}
