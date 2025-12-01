import { IsOptional, IsString } from 'class-validator';

export class UpdateVariableDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  value?: string;
}
