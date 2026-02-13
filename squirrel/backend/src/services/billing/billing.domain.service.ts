import { Injectable } from "@nestjs/common";
import { BillingService } from "../../modules/billing/billing.service";
import { UpgradeDto } from "../../modules/billing/dto/upgrade.dto";

@Injectable()
export class BillingDomainService {
  constructor(private readonly billing: BillingService) {}

  isBillingEnabled() {
    return this.billing.isEnabled();
  }

  async getSubscriptionStatus(userId: string) {
    return this.billing.getUserSubscriptionStatus(userId);
  }

  async startUpgrade(userId: string, dto: UpgradeDto) {
    return this.billing.createUpgradeSession(userId, dto);
  }
}
