import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ShareOrganizationWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsIn(['read', 'write', 'admin'])
  permission!: 'read' | 'write' | 'admin';
}
