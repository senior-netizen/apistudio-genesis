import { Controller, UseGuards } from '@nestjs/common';
import { WorkspacesService } from '../../modules/workspaces/workspaces.service';
import {
  CreateWorkspaceRequest,
  GetWorkspaceRequest,
  ListWorkspacesRequest,
  ListWorkspacesResponse,
  WorkspacesServiceController,
  WorkspacesServiceControllerMethods,
} from '../generated/workspaces';
import { Workspace } from '../generated/common';
import { GrpcJwtGuard } from '../guards/grpc-jwt.guard';
import { getUserFromMetadata } from '../utils/grpc-user.util';
import { Metadata } from '@grpc/grpc-js';

@Controller()
@UseGuards(GrpcJwtGuard)
@WorkspacesServiceControllerMethods()
export class WorkspacesGrpcController implements WorkspacesServiceController {
  constructor(private readonly workspaces: WorkspacesService) {}

  async list(request: ListWorkspacesRequest, metadata?: Metadata): Promise<ListWorkspacesResponse> {
    const user = getUserFromMetadata(metadata);
    const result = await this.workspaces.listForUser(user?.id ?? '', request.page ?? 1, request.pageSize ?? 20);
    return {
      items: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: (item as any).slug ?? '',
        ownerId: item.ownerId,
        createdAt: item.createdAt?.toISOString?.() ?? '',
        updatedAt: item.updatedAt?.toISOString?.() ?? '',
      })) as Workspace[],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async create(request: CreateWorkspaceRequest, metadata?: Metadata): Promise<Workspace> {
    const user = getUserFromMetadata(metadata);
    const created = await this.workspaces.create(user?.id ?? '', {
      name: request.name ?? '',
      slug: request.slug,
    });
    return {
      id: created.id,
      name: created.name,
      slug: (created as any).slug ?? request.slug ?? '',
      ownerId: created.ownerId,
      createdAt: created.createdAt?.toISOString?.() ?? '',
      updatedAt: created.updatedAt?.toISOString?.() ?? '',
    };
  }

  async get(request: GetWorkspaceRequest, metadata?: Metadata): Promise<Workspace> {
    const user = getUserFromMetadata(metadata);
    const workspace = await this.workspaces.getById(request.workspaceId ?? '', user?.id ?? '');
    return {
      id: workspace.id,
      name: workspace.name,
      slug: (workspace as any).slug ?? '',
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt?.toISOString?.() ?? '',
      updatedAt: workspace.updatedAt?.toISOString?.() ?? '',
    };
  }
}
