import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../../modules/analytics/analytics.service";

@Injectable()
export class AnalyticsDomainService {
  constructor(private readonly analytics: AnalyticsService) {}

  async recordRequestRun(
    workspaceId: string,
    requestId: string,
    durationMs: number,
    status: string,
  ) {
    return this.analytics.recordRun(workspaceId, requestId, durationMs, status);
  }

  async getWorkspaceSummary(workspaceId: string) {
    return this.analytics.summary(workspaceId);
  }
}
