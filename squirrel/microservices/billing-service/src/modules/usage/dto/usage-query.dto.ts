import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UsageQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
