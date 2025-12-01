import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { ComposeRequestDto } from './dto/compose-request.dto';
import { ComposerService } from './composer.service';

@ApiTags('ai-composer')
@Controller('composer')
export class ComposerController {
  constructor(private readonly composerService: ComposerService) {}

  @Post()
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Generate a structured API request from natural language.' })
  compose(@Body() dto: ComposeRequestDto) {
    return this.composerService.compose(dto);
  }
}
