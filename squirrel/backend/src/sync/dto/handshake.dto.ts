import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

enum AppKind {
  WEB = 'web',
  DESKTOP = 'desktop',
  VSCODE = 'vscode',
}

export class SyncHandshakeDto {
  @IsString()
  @Length(1, 128)
  clientId!: string;

  @IsString()
  @Length(1, 32)
  protocolVersion!: string;

  @IsEnum(AppKind)
  appKind!: AppKind;

  @IsString()
  @Length(1, 128)
  workspaceId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  deviceFingerprint?: string;
}

export { AppKind };
