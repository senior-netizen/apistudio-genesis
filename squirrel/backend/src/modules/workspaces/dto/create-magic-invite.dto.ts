import { IsEnum, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';
import { WorkspaceRole } from '../../../infra/prisma/enums';

export class CreateMagicInviteDto {
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  expiresInHours?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
