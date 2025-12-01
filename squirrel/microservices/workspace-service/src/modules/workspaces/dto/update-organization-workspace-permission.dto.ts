import { IsIn } from 'class-validator';

export class UpdateOrganizationWorkspacePermissionDto {
  @IsIn(['read', 'write', 'admin'])
  permission!: 'read' | 'write' | 'admin';
}
