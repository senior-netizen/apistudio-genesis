import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../config/redis.service';
import { Project } from './entities/project.entity';
import { Collection } from './entities/collection.entity';
import { Request } from './entities/request.entity';
import { Environment } from './entities/environment.entity';
import { Mock } from './entities/mock.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { CreateMockDto } from './dto/create-mock.dto';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);
  private mockServerRunning = false;

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(Environment)
    private environmentRepository: Repository<Environment>,
    @InjectRepository(Mock)
    private mockRepository: Repository<Mock>,
    private readonly redisService: RedisService,
  ) { }

  // ==================== WORKSPACE ====================
  async getWorkspace(userId: string) {
    const [projects, environments, mocks] = await Promise.all([
      this.projectRepository.find({
        where: { userId },
        relations: ['collections', 'collections.requests'],
        order: { createdAt: 'ASC' },
      }),
      this.environmentRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
      }),
      this.mockRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        collections: p.collections
          .sort((a, b) => a.position - b.position)
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            folders: [],
            tags: [],
            requests: c.requests
              .sort((a, b) => a.position - b.position)
              .map((r) => ({
                id: r.id,
                name: r.name,
                method: r.method,
                url: r.url,
                description: r.description,
                body: r.body,
                headers: r.headers,
                params: r.params,
                auth: r.auth,
                scripts: r.scripts,
                tags: r.tags,
                examples: r.examples,
                lastRunAt: r.lastRunAt?.toISOString(),
              })),
          })),
      })),
      environments: environments.map((e) => ({
        id: e.id,
        name: e.name,
        variables: e.variables,
        isDefault: e.isDefault,
      })),
      mocks: mocks.map((m) => ({
        id: m.id,
        method: m.method,
        url: m.url,
        enabled: m.enabled,
        responseStatus: m.responseStatus,
        responseHeaders: m.responseHeaders,
        responseBody: m.responseBody,
      })),
    };
  }

  // ==================== PROJECTS ====================
  async createProject(userId: string, dto: CreateProjectDto) {
    const project = this.projectRepository.create({
      userId,
      name: dto.name,
    });
    await this.projectRepository.save(project);
    return {
      id: project.id,
      name: project.name,
      collections: [],
    };
  }

  async updateProject(userId: string, id: string, updates: Partial<CreateProjectDto>) {
    const project = await this.projectRepository.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');

    Object.assign(project, updates);
    await this.projectRepository.save(project);

    return {
      id: project.id,
      name: project.name,
      collections: [],
    };
  }

  async deleteProject(userId: string, id: string) {
    const result = await this.projectRepository.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Project not found');
    return { success: true };
  }

  // ==================== COLLECTIONS ====================
  async createCollection(userId: string, projectId: string, dto: CreateCollectionDto) {
    const project = await this.projectRepository.findOne({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('Project not found');

    const maxPosition = await this.collectionRepository
      .createQueryBuilder('collection')
      .where('collection.projectId = :projectId', { projectId })
      .select('MAX(collection.position)', 'max')
      .getRawOne();

    const collection = this.collectionRepository.create({
      projectId,
      name: dto.name,
      description: dto.description,
      position: (maxPosition?.max ?? -1) + 1,
    });
    await this.collectionRepository.save(collection);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      folders: [],
      tags: [],
      requests: [],
    };
  }

  async updateCollection(userId: string, id: string, updates: Partial<CreateCollectionDto>) {
    const collection = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.project', 'project')
      .where('collection.id = :id', { id })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!collection) throw new NotFoundException('Collection not found');

    Object.assign(collection, updates);
    await this.collectionRepository.save(collection);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      folders: [],
      tags: [],
      requests: [],
    };
  }

  async deleteCollection(userId: string, id: string) {
    const collection = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.project', 'project')
      .where('collection.id = :id', { id })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!collection) throw new NotFoundException('Collection not found');

    await this.collectionRepository.delete(id);
    return { success: true };
  }

  async reorderCollections(userId: string, projectId: string, orderedIds: string[]) {
    const project = await this.projectRepository.findOne({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('Project not found');

    await Promise.all(
      orderedIds.map((id, index) =>
        this.collectionRepository.update({ id, projectId }, { position: index }),
      ),
    );

    return { success: true };
  }

  // ==================== REQUESTS ====================
  async createRequest(userId: string, collectionId: string, dto: CreateRequestDto) {
    const collection = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.project', 'project')
      .where('collection.id = :collectionId', { collectionId })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!collection) throw new NotFoundException('Collection not found');

    const maxPosition = await this.requestRepository
      .createQueryBuilder('request')
      .where('request.collectionId = :collectionId', { collectionId })
      .select('MAX(request.position)', 'max')
      .getRawOne();

    const request = this.requestRepository.create({
      collectionId,
      name: dto.name,
      method: dto.method,
      url: dto.url,
      description: dto.description,
      body: dto.body ?? { mode: 'none' },
      headers: dto.headers ?? [],
      params: dto.params ?? [],
      auth: dto.auth ?? { type: 'none' },
      scripts: dto.scripts ?? { preRequest: '', test: '' },
      tags: dto.tags ?? [],
      examples: dto.examples ?? [],
      position: (maxPosition?.max ?? -1) + 1,
    });
    await this.requestRepository.save(request);

    return {
      id: request.id,
      name: request.name,
      method: request.method,
      url: request.url,
      description: request.description,
      body: request.body,
      headers: request.headers,
      params: request.params,
      auth: request.auth,
      scripts: request.scripts,
      tags: request.tags,
      examples: request.examples,
    };
  }

  async updateRequest(userId: string, id: string, updates: Partial<CreateRequestDto>) {
    const request = await this.requestRepository
      .createQueryBuilder('request')
      .leftJoin('request.collection', 'collection')
      .leftJoin('collection.project', 'project')
      .where('request.id = :id', { id })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!request) throw new NotFoundException('Request not found');

    Object.assign(request, updates);
    await this.requestRepository.save(request);

    return {
      id: request.id,
      name: request.name,
      method: request.method,
      url: request.url,
      description: request.description,
      body: request.body,
      headers: request.headers,
      params: request.params,
      auth: request.auth,
      scripts: request.scripts,
      tags: request.tags,
      examples: request.examples,
    };
  }

  async deleteRequest(userId: string, id: string) {
    const request = await this.requestRepository
      .createQueryBuilder('request')
      .leftJoin('request.collection', 'collection')
      .leftJoin('collection.project', 'project')
      .where('request.id = :id', { id })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!request) throw new NotFoundException('Request not found');

    await this.requestRepository.delete(id);
    return { success: true };
  }

  async duplicateRequest(userId: string, id: string) {
    const original = await this.requestRepository
      .createQueryBuilder('request')
      .leftJoin('request.collection', 'collection')
      .leftJoin('collection.project', 'project')
      .where('request.id = :id', { id })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!original) throw new NotFoundException('Request not found');

    const duplicate = this.requestRepository.create({
      ...original,
      id: undefined,
      name: `${original.name} copy`,
      position: original.position + 1,
    });
    await this.requestRepository.save(duplicate);

    return {
      id: duplicate.id,
      name: duplicate.name,
      method: duplicate.method,
      url: duplicate.url,
      description: duplicate.description,
      body: duplicate.body,
      headers: duplicate.headers,
      params: duplicate.params,
      auth: duplicate.auth,
      scripts: duplicate.scripts,
      tags: duplicate.tags,
      examples: duplicate.examples,
    };
  }

  async saveExample(userId: string, requestId: string, example: any) {
    const request = await this.requestRepository
      .createQueryBuilder('request')
      .leftJoin('request.collection', 'collection')
      .leftJoin('collection.project', 'project')
      .where('request.id = :requestId', { requestId })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!request) throw new NotFoundException('Request not found');

    const newExample = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...example,
    };

    request.examples = [...request.examples, newExample];
    await this.requestRepository.save(request);

    return newExample;
  }

  async reorderRequests(userId: string, collectionId: string, orderedIds: string[]) {
    const collection = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.project', 'project')
      .where('collection.id = :collectionId', { collectionId })
      .andWhere('project.userId = :userId', { userId })
      .getOne();

    if (!collection) throw new NotFoundException('Collection not found');

    await Promise.all(
      orderedIds.map((id, index) =>
        this.requestRepository.update({ id, collectionId }, { position: index }),
      ),
    );

    return { success: true };
  }

  // ==================== ENVIRONMENTS ====================
  async createEnvironment(userId: string, dto: CreateEnvironmentDto) {
    if (dto.isDefault) {
      await this.environmentRepository.update({ userId }, { isDefault: false });
    }

    const environment = this.environmentRepository.create({
      userId,
      name: dto.name,
      variables: dto.variables,
      isDefault: dto.isDefault ?? false,
    });
    await this.environmentRepository.save(environment);

    return {
      id: environment.id,
      name: environment.name,
      variables: environment.variables,
      isDefault: environment.isDefault,
    };
  }

  async updateEnvironment(userId: string, id: string, updates: Partial<CreateEnvironmentDto>) {
    const environment = await this.environmentRepository.findOne({ where: { id, userId } });
    if (!environment) throw new NotFoundException('Environment not found');

    if (updates.isDefault) {
      await this.environmentRepository.update({ userId }, { isDefault: false });
    }

    Object.assign(environment, updates);
    await this.environmentRepository.save(environment);

    return {
      id: environment.id,
      name: environment.name,
      variables: environment.variables,
      isDefault: environment.isDefault,
    };
  }

  async deleteEnvironment(userId: string, id: string) {
    const result = await this.environmentRepository.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Environment not found');
    return { success: true };
  }

  // ==================== MOCKS ====================
  async createMock(userId: string, dto: CreateMockDto) {
    const mock = this.mockRepository.create({
      userId,
      ...dto,
    });
    await this.mockRepository.save(mock);

    return {
      id: mock.id,
      method: mock.method,
      url: mock.url,
      enabled: mock.enabled,
      responseStatus: mock.responseStatus,
      responseHeaders: mock.responseHeaders,
      responseBody: mock.responseBody,
    };
  }

  async updateMock(userId: string, id: string, updates: Partial<CreateMockDto>) {
    const mock = await this.mockRepository.findOne({ where: { id, userId } });
    if (!mock) throw new NotFoundException('Mock not found');

    Object.assign(mock, updates);
    await this.mockRepository.save(mock);

    return {
      id: mock.id,
      method: mock.method,
      url: mock.url,
      enabled: mock.enabled,
      responseStatus: mock.responseStatus,
      responseHeaders: mock.responseHeaders,
      responseBody: mock.responseBody,
    };
  }

  async deleteMock(userId: string, id: string) {
    const result = await this.mockRepository.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException('Mock not found');
    return { success: true };
  }

  async toggleMockServer() {
    this.mockServerRunning = !this.mockServerRunning;
    return { running: this.mockServerRunning };
  }
}
