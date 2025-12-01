import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PublishPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  monthlyPriceUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  yearlyPriceUSD?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  burstLimit!: number;
}

export class PublishApiDto {
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  payoutType?: string;

  @IsOptional()
  @IsObject()
  payoutConfig?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUrl()
  baseUrl!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  shortDescription!: string;

  @IsString()
  @IsNotEmpty()
  longDescription!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishPlanDto)
  @ArrayMinSize(1)
  plans!: PublishPlanDto[];
}

export { PublishPlanDto };
