import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class OptimizerDto {
  @IsArray()
  @IsObject({ each: true })
  logs: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  serviceName?: string;
}
