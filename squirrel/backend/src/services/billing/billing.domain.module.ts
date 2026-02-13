import { Module } from "@nestjs/common";
import { BillingModule } from "../../modules/billing/billing.module";
import { BillingDomainService } from "./billing.domain.service";

@Module({
  imports: [BillingModule],
  providers: [BillingDomainService],
  exports: [BillingDomainService],
})
export class BillingDomainModule {}
