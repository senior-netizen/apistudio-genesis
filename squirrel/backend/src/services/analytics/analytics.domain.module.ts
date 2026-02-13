import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../../modules/analytics/analytics.module";
import { AnalyticsDomainService } from "./analytics.domain.service";

@Module({
  imports: [AnalyticsModule],
  providers: [AnalyticsDomainService],
  exports: [AnalyticsDomainService],
})
export class AnalyticsDomainModule {}
