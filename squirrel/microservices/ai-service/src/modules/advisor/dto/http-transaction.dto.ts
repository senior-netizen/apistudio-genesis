import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class KeyValueRecord {
  @IsString({ each: true })
  @IsArray()
  keys: string[];

  @IsArray()
  values: string[];
}

export class HttpRequestDto {
  @IsString()
  method: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: unknown;
}

export class HttpResponseDto {
  @IsInt()
  status: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: unknown;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class AdvisorRequestDto {
  @ValidateNested()
  @Type(() => HttpRequestDto)
  request: HttpRequestDto;

  @ValidateNested()
  @Type(() => HttpResponseDto)
  response: HttpResponseDto;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentAttempts?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => KeyValueRecord)
  environmentSummary?: KeyValueRecord;
}
