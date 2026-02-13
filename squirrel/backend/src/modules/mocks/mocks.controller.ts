import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MocksService } from "./mocks.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("mocks")
@Controller({ version: "1" })
@UseGuards(JwtAuthGuard)
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  @Post("workspaces/:workspaceId/mock-servers")
  async createMockServer(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: { id: string },
    @Body() data: { name: string; baseUrl?: string },
  ) {
    return this.mocks.createMockServer(workspaceId, user.id, data);
  }

  @Get("workspaces/:workspaceId/mock-servers")
  async listMockServers(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.mocks.listMockServers(workspaceId, user.id);
  }

  @Get("workspaces/:workspaceId/mock-analytics")
  async getMockAnalytics(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: { id: string },
    @Query("days") days?: string,
  ) {
    const parsedDays = days ? Number(days) : undefined;
    return this.mocks.getMockAnalytics(
      workspaceId,
      user.id,
      Number.isFinite(parsedDays) ? parsedDays : undefined,
    );
  }

  @Get("mock-servers/:id")
  async getMockServer(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.mocks.getMockServer(id, user.id);
  }

  @Patch("mock-servers/:id")
  async updateMockServer(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body() data: { name?: string; enabled?: boolean },
  ) {
    return this.mocks.updateMockServer(id, user.id, data);
  }

  @Delete("mock-servers/:id")
  async deleteMockServer(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.mocks.deleteMockServer(id, user.id);
  }

  @Post("mock-servers/:id/routes")
  async addRoute(
    @Param("id") mockServerId: string,
    @CurrentUser() user: { id: string },
    @Body()
    data: {
      method: string;
      path: string;
      statusCode?: number;
      responseBody: any;
      responseHeaders?: Record<string, string>;
      delay?: number;
    },
  ) {
    return this.mocks.addRoute(mockServerId, user.id, data);
  }

  @Delete("routes/:id")
  async deleteRoute(
    @Param("id") routeId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.mocks.deleteRoute(routeId, user.id);
  }
}
