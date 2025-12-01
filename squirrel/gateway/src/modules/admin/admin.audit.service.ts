import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface AdminAuditRecord {
  actorId?: string;
  actorEmail?: string;
  actorRoles?: string[];
  action: string;
  target?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async logAction(record: AdminAuditRecord): Promise<void> {
    const logsServiceUrl = this.configService.get<string>('LOGS_SERVICE_URL');
    if (!logsServiceUrl) {
      this.logger.warn('LOGS_SERVICE_URL is not configured; skipping admin audit log');
      return;
    }

    const url = `${logsServiceUrl.replace(/\/$/, '')}/api/logs/admin/audit`;
    const headers = {
      'x-internal-key': this.configService.get('SQUIRREL_INTERNAL_KEY'),
    } as Record<string, string | undefined>;

    try {
      await firstValueFrom(
        this.http.post(url, record, {
          headers,
          validateStatus: () => true,
        }),
      );
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : (error as Error)?.message ?? String(error);
      this.logger.error(`Failed to send admin audit log: ${message}`);
    }
  }
}
