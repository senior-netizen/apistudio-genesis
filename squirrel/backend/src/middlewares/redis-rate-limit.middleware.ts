import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import type Redis from "ioredis";
import type { WorkspacePlan } from "@prisma/client";
import { ConfigType } from "@nestjs/config";
import { createRateLimitMiddleware } from "@squirrel/observability";
import appConfig from "../config/configuration";
import { PrismaService } from "../infra/prisma/prisma.service";
import { AppLogger } from "../infra/logger/app-logger.service";
import { REDIS_CLIENT } from "../infrastructure/redis/redis.tokens";

const PLAN_MULTIPLIERS: Record<WorkspacePlan, number> = {
  FREE: 1,
  TEAM: 2,
  BUSINESS: 4,
  ENTERPRISE: 10,
};

@Injectable()
export class RedisRateLimitMiddleware implements NestMiddleware {
  private readonly delegate: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    appLogger: AppLogger,
  ) {
    this.delegate = createRateLimitMiddleware({
      logger: appLogger.raw,
      provider: async (req: Request, contextualKey: string) => {
        const windowSec = this.config.rateLimit.windowSec;
        const baseLimit = this.config.rateLimit.maxRequests;
        const principalKey = `rate:principal:${contextualKey}`;
        const workspaceId = this.readWorkspaceId(req);

        const workspacePlan = workspaceId
          ? await this.resolveWorkspacePlan(workspaceId)
          : "FREE";
        const workspaceLimit = this.resolveWorkspaceLimit(
          workspacePlan,
          baseLimit,
        );
        const workspaceKey = workspaceId
          ? `rate:workspace:${workspaceId}`
          : undefined;

        const tx = this.redis.multi();
        tx.incr(principalKey).expire(principalKey, windowSec);
        if (workspaceKey) {
          tx.incr(workspaceKey).expire(workspaceKey, windowSec);
        }
        const results = await tx.exec();

        const principalCount = Number(results?.[0]?.[1] ?? 0);
        const workspaceCount = workspaceKey
          ? Number(results?.[2]?.[1] ?? 0)
          : 0;

        const principalAllowed = principalCount <= baseLimit;
        const workspaceAllowed = workspaceKey
          ? workspaceCount <= workspaceLimit
          : true;
        const allowed = principalAllowed && workspaceAllowed;

        const effectiveLimit = workspaceKey
          ? Math.min(baseLimit, workspaceLimit)
          : baseLimit;
        const effectiveRemaining = workspaceKey
          ? Math.min(
              Math.max(baseLimit - principalCount, 0),
              Math.max(workspaceLimit - workspaceCount, 0),
            )
          : Math.max(baseLimit - principalCount, 0);

        return {
          allowed,
          limit: effectiveLimit,
          remaining: effectiveRemaining,
          retryAfterSec: allowed ? undefined : windowSec,
          reason: !principalAllowed
            ? "principal_rate_limit"
            : !workspaceAllowed
              ? `workspace_plan_limit:${workspacePlan.toLowerCase()}`
              : undefined,
        };
      },
      onError: (error: unknown) =>
        appLogger.raw.warn({ error }, "rate limit provider error"),
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    await this.delegate(req, res, next);
  }

  private readWorkspaceId(req: Request): string | undefined {
    const header = req.headers["x-workspace-id"];
    const workspaceId = Array.isArray(header) ? header[0] : header;
    return workspaceId ? String(workspaceId) : undefined;
  }

  private async resolveWorkspacePlan(
    workspaceId: string,
  ): Promise<WorkspacePlan> {
    const cacheKey = `rate:workspace-plan:${workspaceId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached && cached in PLAN_MULTIPLIERS) {
      return cached as WorkspacePlan;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    const plan = workspace?.plan ?? "FREE";
    await this.redis.set(cacheKey, plan, "EX", 300);
    return plan;
  }

  private resolveWorkspaceLimit(
    plan: WorkspacePlan,
    baseLimit: number,
  ): number {
    const multiplier = PLAN_MULTIPLIERS[plan] ?? 1;
    return Math.max(Math.floor(baseLimit * multiplier), baseLimit);
  }
}
