import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RevokeTokenDto {
  @IsOptional()
  @IsString()
  jti?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}

export class SyncTokensDto {
  @IsString({ each: true })
  jtis!: string[];
}

