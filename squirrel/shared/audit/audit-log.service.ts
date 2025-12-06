export type AuditLogContext = {
  entityId?: string;
  entityName?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
};

export interface AuditLogRecord {
  userId?: string;
  workspaceId?: string;
  effectiveRole?: string | null;
  requiredRole?: string | null;
  rbacAllowed: boolean;
  timestamp: string;
  action: string;
  context?: AuditLogContext;
  source?: string;
}

export interface AuditLogQuery {
  workspaceId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogBatchResult {
  records: ReadonlyArray<AuditLogRecord>;
  nextCursor?: number;
}

export class InMemoryAuditLogService {
  private readonly records: AuditLogRecord[] = [];

  async record(entry: AuditLogRecord): Promise<void> {
    try {
      const normalized: AuditLogRecord = Object.freeze({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      });
      this.records.push(normalized);
    } catch (error) {
      // audit logging should never block request flow
      // eslint-disable-next-line no-console
      console.warn('[audit-log] failed to record audit entry', error);
    }
  }

  async list(query: AuditLogQuery = {}): Promise<ReadonlyArray<AuditLogRecord>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? 50);
    const start = (page - 1) * pageSize;
    const filtered = this.records.filter((record) => {
      if (query.workspaceId && record.workspaceId !== query.workspaceId) return false;
      if (query.userId && record.userId !== query.userId) return false;
      return true;
    });
    return Object.freeze(filtered.slice(start, start + pageSize));
  }

  async exportBatch(batchSize = 500, cursor = 0): Promise<AuditLogBatchResult> {
    const safeBatchSize = Math.max(1, batchSize);
    const slice = this.records.slice(cursor, cursor + safeBatchSize);
    const nextCursor = cursor + slice.length;
    return {
      records: Object.freeze(slice),
      nextCursor: nextCursor < this.records.length ? nextCursor : undefined,
    };
  }
}

export const defaultAuditLogService = new InMemoryAuditLogService();
