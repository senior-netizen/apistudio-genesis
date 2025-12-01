import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { CreateMockDto } from './dto/create-mock.dto';

@ApiTags('workspace')
@Controller('workspace')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) { }

  // ==================== WORKSPACE ====================
  @Get()
  @ApiOperation({ summary: 'Get complete workspace data' })
  getWorkspace(@Req() req: any) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.getWorkspace(userId);
  }

  // ==================== PROJECTS ====================
  @Post('projects')
  @ApiOperation({ summary: 'Create new project' })
  createProject(@Req() req: any, @Body() dto: CreateProjectDto) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.createProject(userId, dto);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update project' })
  updateProject(@Req() req: any, @Param('id') id: string, @Body() updates: Partial<CreateProjectDto>) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.updateProject(userId, id, updates);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete project' })
  deleteProject(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.deleteProject(userId, id);
  }

  // ==================== COLLECTIONS ====================
  @Post('projects/:projectId/collections')
  @ApiOperation({ summary: 'Create collection in project' })
  createCollection(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateCollectionDto) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.createCollection(userId, projectId, dto);
  }

  @Patch('collections/:id')
  @ApiOperation({ summary: 'Update collection' })
  updateCollection(@Req() req: any, @Param('id') id: string, @Body() updates: Partial<CreateCollectionDto>) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.updateCollection(userId, id, updates);
  }

  @Delete('collections/:id')
  @ApiOperation({ summary: 'Delete collection' })
  deleteCollection(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.deleteCollection(userId, id);
  }

  @Patch('projects/:projectId/collections/reorder')
  @ApiOperation({ summary: 'Reorder collections' })
  reorderCollections(@Req() req: any, @Param('projectId') projectId: string, @Body() body: { orderedIds: string[] }) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.reorderCollections(userId, projectId, body.orderedIds);
  }

  // ==================== REQUESTS ====================
  @Post('collections/:collectionId/requests')
  @ApiOperation({ summary: 'Create request in collection' })
  createRequest(@Req() req: any, @Param('collectionId') collectionId: string, @Body() dto: CreateRequestDto) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.createRequest(userId, collectionId, dto);
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Update request' })
  updateRequest(@Req() req: any, @Param('id') id: string, @Body() updates: Partial<CreateRequestDto>) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.updateRequest(userId, id, updates);
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Delete request' })
  deleteRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.deleteRequest(userId, id);
  }

  @Post('requests/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate request' })
  duplicateRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.duplicateRequest(userId, id);
  }

  @Post('requests/:requestId/examples')
  @ApiOperation({ summary: 'Save request example' })
  saveExample(@Req() req: any, @Param('requestId') requestId: string, @Body() example: any) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.saveExample(userId, requestId, example);
  }

  @Patch('collections/:collectionId/requests/reorder')
  @ApiOperation({ summary: 'Reorder requests' })
  reorderRequests(@Req() req: any, @Param('collectionId') collectionId: string, @Body() body: { orderedIds: string[] }) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.reorderRequests(userId, collectionId, body.orderedIds);
  }

  // ==================== ENVIRONMENTS ====================
  @Post('environments')
  @ApiOperation({ summary: 'Create environment' })
  createEnvironment(@Req() req: any, @Body() dto: CreateEnvironmentDto) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.createEnvironment(userId, dto);
  }

  @Patch('environments/:id')
  @ApiOperation({ summary: 'Update environment' })
  updateEnvironment(@Req() req: any, @Param('id') id: string, @Body() updates: Partial<CreateEnvironmentDto>) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.updateEnvironment(userId, id, updates);
  }

  @Delete('environments/:id')
  @ApiOperation({ summary: 'Delete environment' })
  deleteEnvironment(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.deleteEnvironment(userId, id);
  }

  // ==================== MOCKS ====================
  @Post('mocks')
  @ApiOperation({ summary: 'Create mock route' })
  createMock(@Req() req: any, @Body() dto: CreateMockDto) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.createMock(userId, dto);
  }

  @Patch('mocks/:id')
  @ApiOperation({ summary: 'Update mock route' })
  updateMock(@Req() req: any, @Param('id') id: string, @Body() updates: Partial<CreateMockDto>) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.updateMock(userId, id, updates);
  }

  @Delete('mocks/:id')
  @ApiOperation({ summary: 'Delete mock route' })
  deleteMock(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'default-user';
    return this.workspacesService.deleteMock(userId, id);
  }

  @Post('mocks/toggle')
  @ApiOperation({ summary: 'Toggle mock server' })
  toggleMockServer() {
    return this.workspacesService.toggleMockServer();
  }
}
