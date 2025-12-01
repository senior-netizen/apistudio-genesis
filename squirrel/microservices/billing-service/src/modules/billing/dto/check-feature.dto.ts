import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CheckFeatureDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  feature!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  creditCost?: number;
}
