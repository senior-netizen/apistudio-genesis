import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export class ExecuteRequestDto {
  @IsString()
  url: string;

  @IsEnum(HttpMethod)
  method: HttpMethod;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  body?: unknown;
}
