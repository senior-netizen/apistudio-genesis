import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { TestGenerationDto } from './dto/test-generation.dto';
import { TestsService } from './tests.service';

@ApiTags('ai-tests')
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles('paid', 'admin', 'founder')
  @ApiOperation({ summary: 'Generate test cases for an API request.' })
  generate(@Body() dto: TestGenerationDto) {
    return this.testsService.generate(dto);
  }
}
