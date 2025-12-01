import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class DeviceCodeRequestDto {
  @IsIn(['cli', 'desktop', 'vscode'])
  clientType!: 'cli' | 'desktop' | 'vscode';

  @IsOptional()
  @IsString()
  scope?: string;
}

export class DeviceCodeVerifyDto {
  @IsString()
  @IsNotEmpty()
  deviceCode!: string;
}

export class DeviceCodeConfirmDto {
  @IsString()
  @Length(6, 12)
  userCode!: string;
}

