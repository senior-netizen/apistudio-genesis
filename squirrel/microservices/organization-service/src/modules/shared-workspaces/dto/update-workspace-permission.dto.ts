import { IsEnum } from 'class-validator';
import { SharedWorkspacePermission } from '../../../shared/constants/organization-roles';

export class UpdateWorkspacePermissionDto {
  @IsEnum(SharedWorkspacePermission)
  permission!: SharedWorkspacePermission;
}
