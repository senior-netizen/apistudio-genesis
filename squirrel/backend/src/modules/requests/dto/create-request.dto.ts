import { Prisma } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(METHODS as unknown as string[], { message: 'Invalid HTTP method' })
  method!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}
