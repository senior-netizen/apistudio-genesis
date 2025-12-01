import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SharedWorkspacePermission } from '../../../shared/constants/organization-roles';

export class ShareWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(SharedWorkspacePermission)
  permission!: SharedWorkspacePermission;
}
