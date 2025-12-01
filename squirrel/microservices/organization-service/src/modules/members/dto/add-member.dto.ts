import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrganizationRole } from '../../../shared/constants/organization-roles';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
