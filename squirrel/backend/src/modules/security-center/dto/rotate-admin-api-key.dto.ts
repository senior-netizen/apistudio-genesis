import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RotateAdminApiKeyDto {
  @ApiPropertyOptional({ description: 'Optional updated expiry timestamp' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional scopes replacement' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Optional IP restriction updates' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipRestrictions?: string[];

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
