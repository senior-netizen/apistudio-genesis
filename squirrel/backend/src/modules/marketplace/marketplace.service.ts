import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PublishApiDto } from './dto/publish-api.dto';
import { BillingInterval, SubscribeDto } from './dto/subscribe.dto';
import { RevokeKeyDto } from './dto/revoke-key.dto';
import { randomBytes, createHash } from 'crypto';
import { BillingService } from '../billing/billing.service';
import { resolveAccountRole } from '../../common/security/owner-role.util';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private readonly prisma: PrismaService, private readonly billing: BillingService) {}

  private prismaDecimal(value?: number | null) {
    if (value === null || value === undefined) {
      return null;
    }
    return new Prisma.Decimal(value);
  }

  private mapPlan(plan: any) {
    return {
      id: plan.id,
      name: plan.name,
      monthlyPriceUSD: plan.monthlyPriceUSD ? Number(plan.monthlyPriceUSD) : null,
      yearlyPriceUSD: plan.yearlyPriceUSD ? Number(plan.yearlyPriceUSD) : null,
      rateLimitPerMinute: plan.rateLimitPerMinute,
      burstLimit: plan.burstLimit,
    };
  }

  private mapApi(api: any) {
    return {
      id: api.id,
      name: api.name,
      baseUrl: api.baseUrl,
      logoUrl: api.logoUrl,
      category: api.category,
      shortDescription: api.shortDescription,
      longDescription: api.longDescription,
      provider: {
        id: api.provider.id,
        displayName: api.provider.displayName,
      },
      plans: api.plans?.map((plan: any) => this.mapPlan(plan)) ?? [],
    };
  }

  async list(page = 1, pageSize = 20) {
    const limit = Math.min(pageSize, 50);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.publishedApi.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { provider: true, plans: true },
      }),
      this.prisma.publishedApi.count(),
    ]);
    return {
      items: items.map((api) => this.mapApi(api)),
      total,
      page,
      pageSize: limit,
    };
  }

  async get(apiId: string) {
    const api = await this.prisma.publishedApi.findUnique({
      where: { id: apiId },
      include: { provider: true, plans: true },
    });
    if (!api) {
      throw new NotFoundException({ code: 'API_NOT_FOUND', message: 'Published API not found' });
    }
    return this.mapApi(api);
  }

  async publish(userId: string, dto: PublishApiDto) {
    const billing = await this.billing.getUserSubscriptionStatus(userId);
    if (billing.billingStatus !== 'active') {
      throw new ForbiddenException({ code: 'PRO_REQUIRED', message: 'Pro subscription required to publish APIs' });
    }
    const payoutConfig = dto.payoutConfig as Prisma.InputJsonValue | undefined;
    const provider = await this.prisma.apiProvider.upsert({
      where: { userId },
      update: {
        displayName: dto.displayName,
        description: dto.description,
        payoutType: dto.payoutType ?? 'manual',
        payoutConfig,
      },
      create: {
        userId,
        displayName: dto.displayName,
        description: dto.description,
        payoutType: dto.payoutType ?? 'manual',
        payoutConfig,
      },
    });

    const api = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.publishedApi.create({
        data: {
          providerId: provider.id,
          name: dto.name,
          baseUrl: dto.baseUrl,
          logoUrl: dto.logoUrl,
          category: dto.category,
          shortDescription: dto.shortDescription,
          longDescription: dto.longDescription,
        },
      });
      for (const plan of dto.plans) {
        await tx.apiPlan.create({
          data: {
            apiId: created.id,
            name: plan.name,
            monthlyPriceUSD: this.prismaDecimal(plan.monthlyPriceUSD),
            yearlyPriceUSD: this.prismaDecimal(plan.yearlyPriceUSD),
            rateLimitPerMinute: plan.rateLimitPerMinute,
            burstLimit: plan.burstLimit,
          },
        });
      }
      return created;
    });

    return this.get(api.id);
  }

  async subscribe(userId: string, apiId: string, dto: SubscribeDto) {
    if (!this.billing.isEnabled()) {
      throw new ForbiddenException({ code: 'BILLING_DISABLED', message: 'Marketplace billing is not configured' });
    }
    const plan = await this.prisma.apiPlan.findUnique({
      where: { id: dto.planId },
      include: { api: { include: { provider: true } } },
    });
    if (!plan || plan.apiId !== apiId) {
      throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found for this API' });
    }
    if (plan.api.provider.userId === userId) {
      throw new ForbiddenException({ code: 'CANNOT_SUBSCRIBE_OWN', message: 'Cannot subscribe to your own API' });
    }
    const priceValue = dto.interval === BillingInterval.MONTHLY ? plan.monthlyPriceUSD : plan.yearlyPriceUSD;
    if (!priceValue || Number(priceValue) <= 0) {
      throw new ForbiddenException({ code: 'INVALID_PLAN_PRICE', message: 'Selected plan does not have pricing configured' });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const rawKey = randomBytes(24).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.create({
      data: {
        apiId,
        subscriberUserId: userId,
        keyHash,
        planId: plan.id,
        status: 'pending',
        billingInterval: dto.interval,
      },
    });
    try {
      const payment = await this.billing.createMarketplacePayment({
        apiKeyId: apiKey.id,
        userId,
        email: user.email ?? undefined,
        amount: Number(priceValue),
        title: `${plan.api.name} - ${plan.name} (${dto.interval})`,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      });
      return {
        checkoutUrl: payment.redirectUrl,
        pollUrl: payment.pollUrl,
        apiKey: rawKey,
        status: 'pending',
      };
    } catch (error) {
      await this.prisma.apiKey.delete({ where: { id: apiKey.id } });
      this.logger.warn(
        `Failed to queue marketplace plan ${plan.id} for user ${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  }

  async listKeys(apiId: string, userId: string) {
    const api = await this.prisma.publishedApi.findUnique({
      where: { id: apiId },
      include: { provider: true },
    });
    if (!api) {
      throw new NotFoundException({ code: 'API_NOT_FOUND', message: 'Published API not found' });
    }
    const isProvider = api.provider.userId === userId;
    const keys = await this.prisma.apiKey.findMany({
      where: isProvider ? { apiId } : { apiId, subscriberUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, subscriber: { select: { displayName: true, email: true, id: true } } },
    });
    return keys.map((key) => ({
      id: key.id,
      status: key.status,
      revoked: key.revoked,
      usageCount: key.usageCount,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      plan: this.mapPlan(key.plan),
      subscriber: isProvider ? key.subscriber : undefined,
    }));
  }

  async revokeKey(userId: string, dto: RevokeKeyDto) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: dto.keyId },
      include: { api: { include: { provider: true } }, subscriber: true },
    });
    if (!key) {
      throw new NotFoundException({ code: 'KEY_NOT_FOUND', message: 'API key not found' });
    }
    const provider = key.api?.provider;
    if (!provider) {
      throw new NotFoundException({ code: 'API_NOT_FOUND', message: 'Published API not found' });
    }
    if (key.subscriberUserId !== userId && provider.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_AUTHORIZED', message: 'Not authorized to revoke this key' });
    }
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: {
        revoked: true,
        status: 'canceled',
      },
    });
    return { status: 'revoked' };
  }

  async analytics(apiId: string, userId: string) {
    const api = await this.prisma.publishedApi.findUnique({
      where: { id: apiId },
      include: {
        provider: {
          include: {
            user: {
              select: { id: true, email: true, role: true, billingStatus: true },
            },
          },
        },
      },
    });
    if (!api) {
      throw new NotFoundException({ code: 'API_NOT_FOUND', message: 'Published API not found' });
    }
    if (api.provider.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_PROVIDER', message: 'Only the API provider can view analytics' });
    }
    const providerUser = api.provider.user;
    const providerRole = resolveAccountRole(providerUser?.email, providerUser?.role);
    if (providerRole !== 'founder' && providerUser?.billingStatus !== 'active') {
      throw new ForbiddenException({ code: 'PRO_REQUIRED', message: 'Pro subscription required for analytics' });
    }
    const logs = await this.prisma.apiUsageLog.findMany({
      where: { apiKey: { apiId } },
      orderBy: { timestamp: 'desc' },
    });
    const perDay = new Map<string, { count: number; success: number; durationTotal: number; durationSamples: number }>();
    let total = 0;
    let success = 0;
    let durationTotal = 0;
    let durationSamples = 0;
    for (const log of logs) {
      total += 1;
      const day = log.timestamp.toISOString().slice(0, 10);
      const entry = perDay.get(day) ?? { count: 0, success: 0, durationTotal: 0, durationSamples: 0 };
      entry.count += 1;
      if (log.status && log.status >= 200 && log.status < 400) {
        entry.success += 1;
        success += 1;
      }
      if (log.durationMs !== null && log.durationMs !== undefined) {
        entry.durationTotal += log.durationMs;
        entry.durationSamples += 1;
        durationTotal += log.durationMs;
        durationSamples += 1;
      }
      perDay.set(day, entry);
    }
    const perDayArr = Array.from(perDay.entries())
      .map(([date, stats]) => ({
        date,
        requests: stats.count,
        successRate: stats.count ? stats.success / stats.count : 0,
        avgLatencyMs: stats.durationSamples ? Math.round(stats.durationTotal / stats.durationSamples) : null,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return {
      totalRequests: total,
      successRate: total ? success / total : 0,
      avgLatencyMs: durationSamples ? Math.round(durationTotal / durationSamples) : null,
      perDay: perDayArr,
    };
  }
}
