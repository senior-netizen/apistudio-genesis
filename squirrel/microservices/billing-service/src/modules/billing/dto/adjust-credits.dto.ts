import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustCreditsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsNumber()
  amount!: number;
}
