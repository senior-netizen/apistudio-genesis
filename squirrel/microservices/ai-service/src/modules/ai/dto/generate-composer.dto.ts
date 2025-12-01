import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ComposeRequestDto } from '../../composer/dto/compose-request.dto';

export class GenerateComposerDto {
  @IsString()
  workspaceId: string;

  @IsString()
  targetApi: string;

  @IsOptional()
  @IsObject()
  seedRequest?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeRequestDto)
  composerRequest?: ComposeRequestDto;
}
