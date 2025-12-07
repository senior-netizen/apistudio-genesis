import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class EmergencyRotationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  dualModeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  revokeOldImmediately?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impactedSystems?: string[];
}
