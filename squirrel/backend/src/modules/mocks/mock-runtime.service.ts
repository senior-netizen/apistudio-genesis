import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CacheService } from "../../infra/cache/cache.service";

interface MockRoute {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseBody: any;
  responseHeaders: any;
  delay: number | null;
  mockServerId: string;
}

interface MatchResult {
  route: MockRoute;
  params: Record<string, string>;
}

@Injectable()
export class MockRuntimeService {
  private readonly logger = new Logger(MockRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findMatchingRoute(
    mockServerId: string,
    method: string,
    path: string,
    query: Record<string, string>,
    headers: Record<string, string>,
  ): Promise<MatchResult | null> {
    // Get routes from cache or database
    const routes = await this.getRoutes(mockServerId);

    // Filter by method
    const methodRoutes = routes.filter(
      (r) => r.method === method.toUpperCase(),
    );

    // Try to find exact match first
    for (const route of methodRoutes) {
      const match = this.matchPath(route.path, path);
      if (match) {
        return {
          route,
          params: match,
        };
      }
    }

    return null;
  }

  private matchPath(
    pattern: string,
    actualPath: string,
  ): Record<string, string> | null {
    // Normalize paths (remove trailing slashes)
    const normalizedPattern = pattern.replace(/\/$/, "") || "/";
    const normalizedActual = actualPath.replace(/\/$/, "") || "/";

    // Exact match
    if (normalizedPattern === normalizedActual) {
      return {};
    }

    // Pattern matching with wildcards
    const patternParts = normalizedPattern.split("/").filter(Boolean);
    const actualParts = normalizedActual.split("/").filter(Boolean);

    // Different lengths mean no match (unless there's a catch-all)
    if (patternParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const actualPart = actualParts[i];

      // Check if it's a param (starts with :)
      if (patternPart.startsWith(":")) {
        const paramName = patternPart.substring(1);
        params[paramName] = actualPart;
      } else if (patternPart !== actualPart) {
        // No match
        return null;
      }
    }

    return params;
  }

  private async getRoutes(mockServerId: string): Promise<MockRoute[]> {
    const cacheKey = `mock:${mockServerId}`;
    const cached = await this.cache.get<MockRoute[]>(cacheKey);
    if (cached) return cached;

    const routes = await this.prisma.mockRoute.findMany({
      where: { mockServerId },
      orderBy: { createdAt: "asc" }, // First created = higher priority
      select: {
        id: true,
        method: true,
        path: true,
        statusCode: true,
        responseBody: true,
        responseHeaders: true,
        delay: true,
        mockServerId: true,
      },
    });

    await this.cache.set(cacheKey, routes, 300); // Cache for 5 minutes
    return routes;
  }

  async recordHit(routeId: string) {
    const route = await this.prisma.mockRoute.findUnique({
      where: { id: routeId },
      include: {
        mockServer: {
          select: { workspaceId: true },
        },
      },
    });

    if (!route?.mockServer?.workspaceId) {
      this.logger.warn(`Cannot record mock hit: route not found (${routeId})`);
      return;
    }

    // Reuse analytics event stream for mock runtime usage metrics.
    await this.prisma.analyticsEvent.create({
      data: {
        workspaceId: route.mockServer.workspaceId,
        requestId: route.id,
        type: "mock.hit",
      },
    });
  }
}
