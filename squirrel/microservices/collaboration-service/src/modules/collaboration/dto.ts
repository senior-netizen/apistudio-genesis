import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class InviteDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsString()
  invitedBy?: string;
}

export class ShareLinkDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(['workspace', 'collection'])
  scope!: 'workspace' | 'collection';

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}

export class ScheduleSessionDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  hostId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  agenda?: string;
}

export class CommentDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsString()
  @MaxLength(500)
  message!: string;
}
