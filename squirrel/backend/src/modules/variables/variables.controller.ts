import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VariablesService } from './variables.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { ListVariablesResponseDto, VariableResponseDto } from './dto/variable-response.dto';

@ApiTags('variables')
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class VariablesController {
  private readonly logger = new Logger(VariablesController.name);

  constructor(private readonly variables: VariablesService) {}

  @Get('workspaces/:workspaceId/variables')
  @ApiOkResponse({ type: ListVariablesResponseDto })
  async list(@Param('workspaceId') workspaceId: string, @CurrentUser() user: { id: string }) {
    try {
      return await this.variables.list(workspaceId, user.id);
    } catch (error) {
      this.logControllerError('variables.list', error, { workspaceId, userId: user.id });
      throw error;
    }
  }

  @Post('workspaces/:workspaceId/variables')
  @ApiOkResponse({ type: VariableResponseDto })
  async createGlobal(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVariableDto,
  ) {
    try {
      return await this.variables.createGlobal(workspaceId, user.id, dto);
    } catch (error) {
      this.logControllerError('variables.create.global', error, { workspaceId, userId: user.id });
      throw error;
    }
  }

  @Post('environments/:environmentId/variables')
  @ApiOkResponse({ type: VariableResponseDto })
  async createForEnvironment(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVariableDto,
  ) {
    try {
      return await this.variables.createForEnvironment(environmentId, user.id, dto);
    } catch (error) {
      this.logControllerError('variables.create.environment', error, {
        environmentId,
        userId: user.id,
      });
      throw error;
    }
  }

  @Patch('variables/:id')
  @ApiOkResponse({ type: VariableResponseDto })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateVariableDto,
  ) {
    try {
      return await this.variables.update(id, user.id, dto);
    } catch (error) {
      this.logControllerError('variables.update', error, { variableId: id, userId: user.id });
      throw error;
    }
  }

  @Delete('variables/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    try {
      return await this.variables.delete(id, user.id);
    } catch (error) {
      this.logControllerError('variables.delete', error, { variableId: id, userId: user.id });
      throw error;
    }
  }

  private logControllerError(event: string, error: unknown, context: Record<string, unknown>) {
    const serializedContext = JSON.stringify({ event, ...context, error: error instanceof Error ? error.message : 'unknown-error' });
    this.logger.error(serializedContext, error instanceof Error ? error.stack : undefined);
  }
}
