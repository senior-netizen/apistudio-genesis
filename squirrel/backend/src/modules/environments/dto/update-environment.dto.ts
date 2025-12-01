import { IsOptional, IsString } from 'class-validator';

export class UpdateEnvironmentDto {
  @IsOptional()
  @IsString()
  name?: string;
}
