import { ApiProperty } from '@nestjs/swagger';

export type VariableScope = 'global' | 'environment';

export class VariableResponseDto {
  @ApiProperty({ description: 'Stable identifier for the variable. DO NOT BREAK – public API contract.' })
  id!: string;

  @ApiProperty({ description: 'Human-readable key used inside templates.' })
  key!: string;

  @ApiProperty({ description: 'Raw value stored for the variable.' })
  value!: string;

  @ApiProperty({ enum: ['global', 'environment'], description: 'Scope for the variable. Frontend relies on this for grouping.' })
  scope!: VariableScope;

  @ApiProperty({ description: 'Indicates whether the variable is active in executions.', default: true })
  enabled!: boolean;

  @ApiProperty({ required: false, description: 'Optional description for UI context.' })
  description?: string;

  @ApiProperty({ required: false, description: 'Hints whether the value is redacted in logs.', default: false })
  secret?: boolean;
}

export class EnvironmentVariablesResponseDto {
  @ApiProperty()
  environmentId!: string;

  @ApiProperty()
  environmentName!: string;

  @ApiProperty({ type: () => [VariableResponseDto] })
  variables!: VariableResponseDto[];
}

export class ListVariablesResponseDto {
  @ApiProperty({ type: () => [VariableResponseDto] })
  global!: VariableResponseDto[];

  @ApiProperty({ type: () => [EnvironmentVariablesResponseDto] })
  environments!: EnvironmentVariablesResponseDto[];
}
