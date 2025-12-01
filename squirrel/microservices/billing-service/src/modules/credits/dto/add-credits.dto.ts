import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class AddCreditsDto {
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
  reason!: string;
}
