import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PlanRequestType {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export class ChangePlanDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsEnum(PlanRequestType)
  plan!: PlanRequestType;

  @IsOptional()
  @IsString()
  reason?: string;
}
