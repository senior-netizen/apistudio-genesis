import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../../../shared/constants/organization-roles';

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
