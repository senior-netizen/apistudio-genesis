import { IsArray, IsOptional, IsString } from 'class-validator';

export class EnvHelperDto {
  @IsArray()
  @IsString({ each: true })
  apiCalls: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];
}
