import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { ScopeType } from './pull.dto';

enum OperationType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  CRDT = 'crdt',
}

class SyncChangeDto {
  @IsString()
  @Length(1, 128)
  id!: string;

  @IsEnum(ScopeType)
  scopeType!: ScopeType;

  @IsString()
  @Length(1, 128)
  scopeId!: string;

  @IsString()
  @Length(1, 128)
  deviceId!: string;

  @IsEnum(OperationType)
  opType!: OperationType;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsNumber()
  @Min(0)
  lamport!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clientTimestamp?: number;
}

export class SyncPushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeDto)
  changes!: SyncChangeDto[];

  @IsOptional()
  @IsObject()
  vectorClock?: Record<string, number>;
}

export { SyncChangeDto, OperationType };
