import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class SubscribeDto {
  @IsString()
  planId!: string;

  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}

export { BillingInterval };
