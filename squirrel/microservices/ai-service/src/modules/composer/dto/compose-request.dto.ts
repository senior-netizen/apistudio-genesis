import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ComposeRequestDto {
  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  preferredMethod?: string;

  @IsOptional()
  @IsObject()
  knownHeaders?: Record<string, string>;

  @IsOptional()
  @IsObject()
  samplePayload?: Record<string, unknown>;
}
