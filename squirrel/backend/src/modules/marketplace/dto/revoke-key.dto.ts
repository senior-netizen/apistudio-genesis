import { IsString } from 'class-validator';

export class RevokeKeyDto {
  @IsString()
  keyId!: string;
}
