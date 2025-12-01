import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AdvisorRequestDto } from '../../advisor/dto/http-transaction.dto';

export class GenerateAdvisorResponseDto {
  @IsString()
  workspaceId: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextMessages?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AdvisorRequestDto)
  advisorRequest?: AdvisorRequestDto;
}
