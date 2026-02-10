import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';

type LedgerMismatchAlert = {
  mismatchRatio: number;
  mismatchAmount: number;
  settledAmount: number;
  evaluatedTransactions: number;
  windowHours: number;
  currency: string;
};

@Injectable()
export class BillingSettlementAlertService {
  private readonly logger = new Logger(BillingSettlementAlertService.name);

  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {}

  async sendLedgerMismatchAlert(alert: LedgerMismatchAlert): Promise<void> {
    const percent = (alert.mismatchRatio * 100).toFixed(2);
    const message =
      `Billing settlement mismatch detected (${percent}% > ${(this.config.billing.settlementMismatchThreshold * 100).toFixed(2)}%). ` +
      `window=${alert.windowHours}h tx=${alert.evaluatedTransactions} ` +
      `mismatch=${alert.mismatchAmount.toFixed(2)} ${alert.currency} settled=${alert.settledAmount.toFixed(2)} ${alert.currency}`;

    this.logger.error(message);

    const webhookUrl = this.config.billing.settlementAlertWebhookUrl;
    if (!webhookUrl) {
      this.logger.warn('BILLING_SETTLEMENT_ALERT_WEBHOOK_URL not configured; alert logged locally only.');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'billing.settlement.mismatch',
          severity: 'critical',
          ...alert,
          threshold: this.config.billing.settlementMismatchThreshold,
          triggeredAt: new Date().toISOString(),
        }),
      });
      this.logger.log('Billing settlement mismatch webhook sent.');
    } catch (error) {
      this.logger.error(
        `Failed to send billing settlement alert webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
