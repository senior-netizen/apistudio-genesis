import { IsString, IsNotEmpty, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMockDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    method: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    url: string;

    @ApiProperty()
    @IsBoolean()
    enabled: boolean;

    @ApiProperty()
    @IsNumber()
    responseStatus: number;

    @ApiProperty()
    @IsArray()
    responseHeaders: any[];

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    responseBody: string;
}
