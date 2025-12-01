import { Injectable, NotFoundException } from '@nestjs/common';
// Avoid tight coupling to Prisma types for offline builds
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CacheService } from '../../infra/cache/cache.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

@Injectable()
export class RequestsService {
  private static readonly METADATA_TTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queues: QueueService,
  ) {}

  async list(collectionId: string, userId: string, page = 1, pageSize = 20) {
    const limit = Math.min(pageSize, 100);
    const skip = (page - 1) * limit;
    await this.ensureCollectionOwnership(collectionId, userId);
    const cacheKey = `requests:${collectionId}:${page}:${limit}`;
    const cached = await this.cache.get<{ items: unknown; total: number }>(cacheKey);
    if (cached) {
      return { ...cached, page, pageSize: limit };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where: { collectionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.count({ where: { collectionId } }),
    ]);
    const payload = { items, total };
    await this.cache.set(cacheKey, payload, RequestsService.METADATA_TTL);
    return { ...payload, page, pageSize: limit };
  }

  async create(collectionId: string, userId: string, dto: CreateRequestDto) {
    const collection = await this.ensureCollectionOwnership(collectionId, userId);
    const request = await this.prisma.request.create({
      data: {
        collectionId,
        name: dto.name,
        method: dto.method,
        url: dto.url,
        headers: dto.headers ?? {},
        body: this.normalizeJson(dto.body),
      },
    });
    await this.invalidateCache(request.id, collection.id);
    return request;
  }

  async update(id: string, userId: string, dto: UpdateRequestDto) {
    const existing = await this.getRequestForOwner(id, userId);
    let targetCollectionId = existing.collectionId;
    if (dto.collectionId) {
      const targetCollection = await this.ensureCollectionOwnership(dto.collectionId, userId);
      targetCollectionId = targetCollection.id;
    } else if (dto.collectionId === null) {
      throw new NotFoundException({
        code: 'REQUEST_COLLECTION_REQUIRED',
        message: 'Requests must belong to a collection',
      });
    }

    const data = this.mapUpdateDto(dto);
    data.collectionId = targetCollectionId;

    const request = await this.prisma.request.update({
      where: { id },
      data,
    });
    await this.invalidateCache(id, targetCollectionId);
    if (targetCollectionId !== existing.collectionId) {
      await this.cache.delPrefix(`requests:${existing.collectionId}`);
    }
    return request;
  }

  async delete(id: string, userId: string) {
    const existing = await this.getRequestForOwner(id, userId);
    await this.prisma.request.delete({ where: { id } });
    await this.invalidateCache(id, existing.collectionId);
    return { status: 'deleted' };
  }

  async findById(id: string) {
    const cached = await this.cache.get(`request:${id}`);
    if (cached) return cached;
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    }
    await this.cache.set(`request:${id}`, request, RequestsService.METADATA_TTL);
    return request;
  }

  async run(requestId: string, userId: string) {
    await this.getRequestForOwner(requestId, userId);
    const run = await this.prisma.requestRun.create({
      data: {
        requestId,
        userId,
        status: 'QUEUED',
      },
    });
    const queue = this.queues.getQueue(QUEUES.RUN_EXECUTE);
    await queue.add(
      'execute',
      {
        requestId,
        runId: run.id,
        userId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      },
    );
    return { runId: run.id };
  }

  async history(requestId: string, userId: string, page = 1, pageSize = 20) {
    await this.getRequestForOwner(requestId, userId);
    const limit = Math.min(pageSize, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.requestRun.findMany({
        where: { requestId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.requestRun.count({ where: { requestId } }),
    ]);
    return { items, total, page, pageSize: limit };
  }

  private async invalidateCache(id: string, collectionId: string) {
    await this.cache.del(`request:${id}`);
    await this.cache.delPrefix(`requests:${collectionId}`);
  }

  private normalizeJson(value: any) {
    if (value === undefined) {
      return undefined;
    }
    return value;
  }

  private mapUpdateDto(dto: UpdateRequestDto): any {
    const data: any = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.method !== undefined) {
      data.method = dto.method;
    }

    if (dto.url !== undefined) {
      data.url = dto.url;
    }

    if (dto.headers !== undefined) {
      data.headers = dto.headers;
    }

    if (dto.body !== undefined) {
      data.body = this.normalizeJson(dto.body);
    }

    return data;
  }

  private async ensureCollectionOwnership(collectionId: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
    });
    if (!collection || collection.workspace?.ownerId !== userId) {
      throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Collection not found' });
    }
    return collection;
  }

  private async getRequestForOwner(id: string, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        method: true,
        url: true,
        headers: true,
        body: true,
        collectionId: true,
        collection: { select: { workspaceId: true, workspace: { select: { ownerId: true } } } },
      },
    });
    if (!request || request.collection.workspace?.ownerId !== userId) {
      throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    }
    return request;
  }
}
