import { IsString, Length } from 'class-validator';

export class AcceptMagicInviteDto {
  @IsString()
  @Length(32, 128)
  token!: string;
}
