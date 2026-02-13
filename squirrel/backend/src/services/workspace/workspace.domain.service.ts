import { Injectable } from "@nestjs/common";
import { WorkspacesService } from "../../modules/workspaces/workspaces.service";
import { CreateWorkspaceDto } from "../../modules/workspaces/dto/create-workspace.dto";

@Injectable()
export class WorkspaceDomainService {
  constructor(private readonly workspaces: WorkspacesService) {}

  async listUserWorkspaces(userId: string, page = 1, pageSize = 20) {
    return this.workspaces.listForUser(userId, page, pageSize);
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    return this.workspaces.create(userId, dto);
  }

  async getWorkspaceMetadata(workspaceId: string) {
    return this.workspaces.getMetadata(workspaceId);
  }
}
