import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminApiKeyType } from '../../../infra/prisma/enums';

export class CreateAdminApiKeyDto {
  @ApiPropertyOptional({ description: 'Workspace to scope the key to (required for workspace keys)' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @ApiPropertyOptional({ enum: AdminApiKeyType, default: AdminApiKeyType.WORKSPACE })
  @IsOptional()
  @IsEnum(AdminApiKeyType)
  type?: AdminApiKeyType;

  @ApiPropertyOptional({ description: 'ISO timestamp for expiry' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Human-friendly description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional list of CIDR blocks or IPs allowed' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipRestrictions?: string[];
}
