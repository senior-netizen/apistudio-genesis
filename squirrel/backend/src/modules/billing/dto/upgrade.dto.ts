import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

enum BillingPlan {
  PRO_MONTHLY = 'PRO_MONTHLY',
  PRO_YEARLY = 'PRO_YEARLY',
}

export class UpgradeDto {
  @IsEnum(BillingPlan)
  plan!: BillingPlan;

  @IsOptional()
  @IsString()
  @IsUrl()
  successUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  cancelUrl?: string;
}

export { BillingPlan };
