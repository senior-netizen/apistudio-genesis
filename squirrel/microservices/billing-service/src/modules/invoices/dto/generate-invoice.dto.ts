import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GenerateInvoiceDto {
  @IsString()
  userId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  status?: 'draft' | 'sent' | 'paid' | 'void';
}
