import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Paynow } from 'paynow';
import appConfig from '../../config/configuration';

type PaynowInitResponse = {
  success: boolean;
  redirectUrl?: string;
  pollUrl?: string;
  error?: string;
};

@Injectable()
export class PaynowService {
  private readonly logger = new Logger(PaynowService.name);

  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {}

  private createClient(overrides?: { returnUrl?: string; resultUrl?: string }) {
    const { billing } = this.config;
    const paynow = new Paynow(
      billing.paynowIntegrationId,
      billing.paynowIntegrationKey,
      overrides?.resultUrl ?? billing.paynowResultUrl,
      overrides?.returnUrl ?? billing.paynowReturnUrl,
    );
    return paynow;
  }

  async createPayment(
    reference: string,
    amount: number,
    description: string,
    authEmail?: string,
    overrides?: { returnUrl?: string; resultUrl?: string },
  ): Promise<PaynowInitResponse> {
    const client = this.createClient(overrides);
    const payment = client.createPayment(reference);
    if (authEmail) {
      payment.authEmail = authEmail;
    }
    payment.add(description, amount);
    try {
      const response = await client.send(payment);
      return {
        success: Boolean(response?.status?.toString().toLowerCase() === 'ok'),
        redirectUrl: response?.browserurl ? String(response.browserurl) : undefined,
        pollUrl: response?.pollurl ? String(response.pollurl) : undefined,
        error: response?.error ? String(response.error) : undefined,
      };
    } catch (error) {
      this.logger.warn(`Paynow request for ${reference} failed: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async pollTransaction(pollUrl: string): Promise<PaynowInitResponse> {
    const client = this.createClient();
    const response = await client.pollTransaction(pollUrl);
    return {
      success: Boolean(response?.status?.toString().toLowerCase() === 'ok'),
      redirectUrl: response?.browserurl ? String(response.browserurl) : undefined,
      pollUrl: response?.pollurl ? String(response.pollurl) : undefined,
      error: response?.error ? String(response.error) : undefined,
    };
  }
}
