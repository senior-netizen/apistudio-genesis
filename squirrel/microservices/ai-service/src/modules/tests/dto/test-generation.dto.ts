import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class TestRequestDefinitionDto {
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

class ResponseSampleDto {
  @IsInt()
  status: number;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

export class TestGenerationDto {
  @ValidateNested()
  @Type(() => TestRequestDefinitionDto)
  request: TestRequestDefinitionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResponseSampleDto)
  responseSample?: ResponseSampleDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assertions?: string[];
}
