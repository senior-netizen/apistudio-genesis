import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    method: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    url: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    body?: any;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    headers?: any[];

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    params?: any[];

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    auth?: any;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    scripts?: any;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    tags?: string[];

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    examples?: any[];
}
