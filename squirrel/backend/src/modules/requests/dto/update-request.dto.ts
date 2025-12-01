import { Prisma } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(METHODS as unknown as string[], { message: 'Invalid HTTP method' })
  method?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;

  @IsOptional()
  @IsString()
  collectionId?: string;
}
