import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UpgradeDto, BillingPlan } from "./dto/upgrade.dto";
import appConfig from "../../config/configuration";
import { PaynowService } from "./paynow.service";
import { resolveAccountRole } from "../../common/security/owner-role.util";

export interface BillingPortalSessionResponse {
  mode: "paynow-manual";
  redirectUrl: string;
  message: string;
  supportEmail?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paynow: PaynowService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  isEnabled(): boolean {
    const { billing } = this.config;
    return Boolean(billing.paynowIntegrationId && billing.paynowIntegrationKey);
  }

  async getUserSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        billingStatus: true,
        role: true,
        proSubscriptionId: true,
        email: true,
      },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }
    const role = resolveAccountRole(user.email, user.role);
    if (role === "founder") {
      return {
        billingStatus: "active" as const,
        plan: "pro" as const,
        unlimited: true as const,
      };
    }
    const plan =
      user.billingStatus === "active" && user.proSubscriptionId
        ? ("pro" as const)
        : ("free" as const);
    return {
      billingStatus: user.billingStatus,
      plan,
      unlimited: false as const,
    };
  }

  async createUpgradeSession(userId: string, dto: UpgradeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }
    const successUrl = dto.successUrl ?? this.config.billing.billingSuccessUrl;
    const planAmount =
      dto.plan === BillingPlan.PRO_MONTHLY
        ? this.config.billing.proMonthlyAmount
        : this.config.billing.proYearlyAmount;
    const reference = `pro_${userId}_${Date.now()}`;
    const description =
      dto.plan === BillingPlan.PRO_MONTHLY ? "Pro (monthly)" : "Pro (yearly)";
    const response = await this.paynow.createPayment(
      reference,
      planAmount,
      description,
      user.email ?? undefined,
      {
        returnUrl: successUrl,
      },
    );
    if (!response.success) {
      throw new Error(
        response.error
          ? String(response.error)
          : "Paynow initialization failed",
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        billingStatus: "pending",
        proSubscriptionId: reference,
      },
    });
    return {
      reference,
      amount: planAmount,
      redirectUrl: response.redirectUrl
        ? String(response.redirectUrl)
        : undefined,
      pollUrl: response.pollUrl ? String(response.pollUrl) : undefined,
      successUrl,
      cancelUrl: dto.cancelUrl ?? this.config.billing.billingCancelUrl,
    };
  }

  async createPortalSession(
    userId: string,
  ): Promise<BillingPortalSessionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const response: BillingPortalSessionResponse = {
      mode: "paynow-manual",
      redirectUrl: this.config.billing.billingSuccessUrl,
      message:
        "Paynow does not currently expose a self-serve billing portal. Use this billing page to review your plan and contact support for subscription changes.",
      supportEmail: this.config.owner.email,
    };

    this.logger.log(
      `Billing portal fallback session issued for user=${userId}`,
    );
    return response;
  }

  async createMarketplacePayment(options: {
    apiKeyId: string;
    userId: string;
    amount: number;
    title: string;
    successUrl?: string;
    cancelUrl?: string;
    email?: string | null;
  }) {
    const reference = `api_plan_${options.apiKeyId}_${Date.now()}`;
    const response = await this.paynow.createPayment(
      reference,
      options.amount,
      options.title,
      options.email ?? undefined,
      {
        returnUrl:
          options.successUrl ?? this.config.billing.marketplaceSuccessUrl,
      },
    );
    if (!response.success) {
      throw new Error(
        response.error
          ? String(response.error)
          : "Paynow initialization failed",
      );
    }
    await this.prisma.apiKey.update({
      where: { id: options.apiKeyId },
      data: {
        status: "pending",
      },
    });
    return {
      reference,
      pollUrl: response.pollUrl ? String(response.pollUrl) : undefined,
      redirectUrl: response.redirectUrl
        ? String(response.redirectUrl)
        : undefined,
      successUrl:
        options.successUrl ?? this.config.billing.marketplaceSuccessUrl,
      cancelUrl: options.cancelUrl ?? this.config.billing.marketplaceCancelUrl,
      amount: options.amount,
    };
  }
}
