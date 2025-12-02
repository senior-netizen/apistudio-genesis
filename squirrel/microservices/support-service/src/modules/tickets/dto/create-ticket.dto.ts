import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ enum: TicketPriority, required: false })
    @IsEnum(TicketPriority)
    @IsOptional()
    priority?: TicketPriority;

    @ApiProperty({ required: false })
    @IsUUID()
    @IsOptional()
    workspaceId?: string;
}
