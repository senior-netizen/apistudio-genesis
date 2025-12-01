import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageEventEntity } from '../../shared/entities';

interface RecordUsageOptions {
  userId?: string;
  organizationId?: string;
  type: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectRepository(UsageEventEntity)
    private readonly usageRepository: Repository<UsageEventEntity>,
  ) {}

  async recordUsage(options: RecordUsageOptions): Promise<UsageEventEntity> {
    const usage = this.usageRepository.create({
      userId: options.userId ?? null,
      organizationId: options.organizationId ?? null,
      type: options.type,
      amount: options.amount,
      metadata: options.metadata ?? null,
    });
    const saved = await this.usageRepository.save(usage);
    this.logger.debug(
      `Recorded usage event ${saved.id} for ${options.organizationId ?? options.userId ?? 'n/a'}`,
    );
    return saved;
  }

  async listUserEvents(userId: string, limit = 50) {
    return this.usageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findForUser(userId: string, filters: { from?: Date; to?: Date; type?: string }) {
    const query = this.usageRepository
      .createQueryBuilder('usage')
      .where('usage.user_id = :userId', { userId });

    if (filters.type) {
      query.andWhere('usage.type = :type', { type: filters.type });
    }

    if (filters.from) {
      query.andWhere('usage.created_at >= :from', { from: filters.from.toISOString() });
    }

    if (filters.to) {
      query.andWhere('usage.created_at <= :to', { to: filters.to.toISOString() });
    }

    query.orderBy('usage.created_at', 'DESC');
    return query.getMany();
  }

  async findForAdmin(userId: string, filters: { from?: Date; to?: Date; type?: string }) {
    return this.findForUser(userId, filters);
  }

  async findForOrganization(
    organizationId: string,
    filters: { from?: Date; to?: Date; type?: string },
  ) {
    const query = this.usageRepository
      .createQueryBuilder('usage')
      .where('usage.organization_id = :organizationId', { organizationId });

    if (filters.type) {
      query.andWhere('usage.type = :type', { type: filters.type });
    }

    if (filters.from) {
      query.andWhere('usage.created_at >= :from', { from: filters.from.toISOString() });
    }

    if (filters.to) {
      query.andWhere('usage.created_at <= :to', { to: filters.to.toISOString() });
    }

    query.orderBy('usage.created_at', 'DESC');
    return query.getMany();
  }
}
