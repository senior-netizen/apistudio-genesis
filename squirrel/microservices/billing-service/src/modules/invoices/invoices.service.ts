import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { InternalInvoiceEntity, UsageEventEntity } from '../../shared/entities';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InternalInvoiceEntity)
    private readonly invoiceRepository: Repository<InternalInvoiceEntity>,
    @InjectRepository(UsageEventEntity)
    private readonly usageRepository: Repository<UsageEventEntity>,
  ) {}

  async listUserInvoices(userId: string) {
    return this.invoiceRepository.find({ where: { userId }, order: { periodStart: 'DESC' } });
  }

  async createInternalInvoice(payload: GenerateInvoiceDto) {
    const periodStart = new Date(payload.periodStart);
    const periodEnd = new Date(payload.periodEnd);

    const usage = await this.usageRepository.find({
      where: {
        userId: payload.userId,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    const totalCreditsUsed = usage.reduce((sum, event) => sum + event.amount, 0);

    const invoice = this.invoiceRepository.create({
      userId: payload.userId,
      planId: null,
      periodStart,
      periodEnd,
      totalCreditsUsed,
      status: payload.status ?? 'draft',
    });

    return this.invoiceRepository.save(invoice);
  }
}
