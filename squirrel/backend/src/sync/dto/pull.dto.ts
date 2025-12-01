import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';

enum ScopeType {
  WORKSPACE = 'workspace',
  PROJECT = 'project',
  COLLECTION = 'collection',
  REQUEST = 'request',
  ENVIRONMENT = 'environment',
  VARIABLE = 'variable',
  SECRET = 'secret',
}

export class SyncPullDto {
  @IsEnum(ScopeType)
  scopeType!: ScopeType;

  @IsString()
  @Length(1, 128)
  scopeId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sinceEpoch?: number;

  @IsOptional()
  @IsObject()
  vectorClock?: Record<string, number>;
}

export { ScopeType };
