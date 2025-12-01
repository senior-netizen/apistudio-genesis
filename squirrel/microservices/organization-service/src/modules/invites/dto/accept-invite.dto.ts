import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
