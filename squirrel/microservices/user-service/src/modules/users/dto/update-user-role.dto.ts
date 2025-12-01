import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles: string[];
}
