import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class DeductCreditsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  type!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
