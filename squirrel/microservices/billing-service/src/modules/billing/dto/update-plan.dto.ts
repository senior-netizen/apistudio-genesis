import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BillingPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsEnum(BillingPlan)
  plan!: BillingPlan;

  @IsString()
  workspaceId?: string;
}
