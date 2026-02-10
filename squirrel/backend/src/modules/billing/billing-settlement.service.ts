import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import appConfig from '../../config/configuration';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaynowService } from './paynow.service';
import { BillingSettlementAlertService } from './billing-settlement-alert.service';

type ReconciliationRecord = {
  id: string;
  amount: number;
  currency: string;
  pollUrl?: string;
  paynowReference?: string;
};

@Injectable()
export class BillingSettlementService {
  private readonly logger = new Logger(BillingSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paynow: PaynowService,
    private readonly alerts: BillingSettlementAlertService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Cron(process.env.BILLING_SETTLEMENT_CRON ?? '0 2 * * *')
  async runScheduledSettlement(): Promise<void> {
    if (!this.config.billing.settlementEnabled) {
      this.logger.debug('Billing settlement reconciliation is disabled.');
      return;
    }
    await this.runSettlementCheck();
  }

  async runSettlementCheck(): Promise<void> {
    const lookbackHours = this.config.billing.settlementLookbackHours;
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const txs = await this.prisma.creditsTransaction.findMany({
      where: {
        recordedAt: { gte: since },
        amount: { gt: 0 },
        currency: this.config.billing.ledgerCurrency,
      },
      orderBy: { recordedAt: 'desc' },
      take: this.config.billing.settlementMaxTransactions,
      select: {
        id: true,
        amount: true,
        currency: true,
        metadata: true,
      },
    });

    const records = txs
      .map((tx): ReconciliationRecord | null => {
        const metadata = this.parseMetadata(tx.metadata);
        const pollUrl = this.readString(metadata.paynowPollUrl) ?? this.readString(metadata.pollUrl);
        const paynowReference = this.readString(metadata.paynowReference) ?? this.readString(metadata.reference);
        if (!pollUrl && !paynowReference) {
          return null;
        }
        return {
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          pollUrl,
          paynowReference,
        };
      })
      .filter((v): v is ReconciliationRecord => Boolean(v));

    if (records.length === 0) {
      this.logger.log('No recent Paynow-linked credit transactions to reconcile.');
      return;
    }

    let settledAmount = 0;
    let unsettledAmount = 0;
    let settledCount = 0;

    for (const record of records) {
      const paid = await this.isPaid(record);
      if (paid) {
        settledCount += 1;
        settledAmount += record.amount;
      } else {
        unsettledAmount += record.amount;
      }
    }

    const totalAmount = settledAmount + unsettledAmount;
    const mismatchRatio = totalAmount > 0 ? unsettledAmount / totalAmount : 0;

    this.logger.log(
      `Billing reconciliation complete: ${settledCount}/${records.length} settled, ` +
        `settled=${settledAmount.toFixed(2)} ${this.config.billing.ledgerCurrency}, ` +
        `unsettled=${unsettledAmount.toFixed(2)} ${this.config.billing.ledgerCurrency}, ` +
        `mismatchRatio=${(mismatchRatio * 100).toFixed(2)}%`,
    );

    if (mismatchRatio > this.config.billing.settlementMismatchThreshold) {
      await this.alerts.sendLedgerMismatchAlert({
        mismatchRatio,
        mismatchAmount: unsettledAmount,
        settledAmount,
        evaluatedTransactions: records.length,
        windowHours: lookbackHours,
        currency: this.config.billing.ledgerCurrency,
      });
    }
  }

  private async isPaid(record: ReconciliationRecord): Promise<boolean> {
    if (!record.pollUrl) {
      return false;
    }
    try {
      const result = await this.paynow.pollTransaction(record.pollUrl);
      return Boolean(result.success);
    } catch (error) {
      this.logger.warn(
        `Failed to poll Paynow transaction ${record.id}${record.paynowReference ? ` (${record.paynowReference})` : ''}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private parseMetadata(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, Prisma.JsonValue>;
  }

  private readString(value: Prisma.JsonValue | undefined): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
