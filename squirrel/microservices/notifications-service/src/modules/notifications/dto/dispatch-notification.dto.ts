import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsObject } from 'class-validator';

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in-app',
}

export class DispatchNotificationDto {
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  template: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
