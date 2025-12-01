import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationRole } from '../../../shared/constants/organization-roles';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(OrganizationRole)
  role!: OrganizationRole;

  @IsString()
  @IsOptional()
  message?: string;
}
