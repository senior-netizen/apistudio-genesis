import { IsEmail, IsEnum } from 'class-validator';
import { WorkspaceRole } from '../../../infra/prisma/enums';

export class InviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
