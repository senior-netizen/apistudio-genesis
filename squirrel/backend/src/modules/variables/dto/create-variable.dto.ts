import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVariableDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
