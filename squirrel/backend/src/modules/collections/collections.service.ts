import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CacheService } from '../../infra/cache/cache.service';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  private static readonly METADATA_TTL = 60;

  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  async list(workspaceId: string, userId: string) {
    await this.ensureWorkspaceOwnership(workspaceId, userId);
    const cacheKey = `collections:${workspaceId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    const collections = await this.prisma.collection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    await this.cache.set(cacheKey, collections, CollectionsService.METADATA_TTL);
    return collections;
  }

  async create(workspaceId: string, userId: string, dto: CreateCollectionDto) {
    await this.ensureWorkspaceOwnership(workspaceId, userId);
    let parentId: string | null = null;
    if (dto.parentCollectionId) {
      const parent = await this.prisma.collection.findUnique({
        where: { id: dto.parentCollectionId },
        select: { id: true, workspaceId: true },
      });
      if (!parent || parent.workspaceId !== workspaceId) {
        throw new NotFoundException({ code: 'COLLECTION_PARENT_NOT_FOUND', message: 'Parent collection not found' });
      }
      parentId = parent.id;
    }
    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        workspaceId,
        parentCollectionId: parentId,
      },
    });
    await this.cache.del(`collections:${workspaceId}`);
    return collection;
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.getCollectionForOwner(id, userId);
    let parentId = collection.parentCollectionId ?? null;
    if (dto.parentCollectionId !== undefined) {
      if (dto.parentCollectionId === null || dto.parentCollectionId === '') {
        parentId = null;
      } else {
        if (dto.parentCollectionId === id) {
          throw new NotFoundException({ code: 'COLLECTION_PARENT_INVALID', message: 'Collection cannot be its own parent' });
        }
        const parent = await this.prisma.collection.findUnique({
          where: { id: dto.parentCollectionId },
          select: { id: true, workspaceId: true },
        });
        if (!parent || parent.workspaceId !== collection.workspaceId) {
          throw new NotFoundException({
            code: 'COLLECTION_PARENT_NOT_FOUND',
            message: 'Parent collection not found',
          });
        }
        parentId = parent.id;
      }
    }

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        name: dto.name ?? collection.name,
        parentCollectionId: parentId,
      },
    });
    await this.cache.del(`collections:${collection.workspaceId}`);
    return updated;
  }

  async remove(id: string, userId: string) {
    const collection = await this.getCollectionForOwner(id, userId);
    await this.prisma.collection.delete({ where: { id } });
    await this.cache.del(`collections:${collection.workspaceId}`);
    return { status: 'deleted' };
  }

  private async ensureWorkspaceOwnership(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    }
  }

  private async getCollectionForOwner(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        parentCollectionId: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!collection || collection.workspace?.ownerId !== userId) {
      throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Collection not found' });
    }
    return collection;
  }
}
