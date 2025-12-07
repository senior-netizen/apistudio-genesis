import { ActiveElevation, ElevationQueryInput, ElevationRequest } from './types';

export interface ElevationRepository {
  create(request: ElevationRequest): Promise<ElevationRequest>;
  update(id: string, update: Partial<ElevationRequest>): Promise<ElevationRequest | null>;
  findById(id: string): Promise<ElevationRequest | null>;
  findActiveForUser(query: ElevationQueryInput, now: Date): Promise<ElevationRequest | null>;
  findExpired(now: Date): Promise<ElevationRequest[]>;
}

export class InMemoryElevationRepository implements ElevationRepository {
  private storage: ElevationRequest[] = [];

  async create(request: ElevationRequest): Promise<ElevationRequest> {
    this.storage.push(request);
    return request;
  }

  async update(id: string, update: Partial<ElevationRequest>): Promise<ElevationRequest | null> {
    const idx = this.storage.findIndex((entry) => entry.id === id);
    if (idx === -1) return null;
    this.storage[idx] = { ...this.storage[idx], ...update, updatedAt: update.updatedAt ?? new Date() };
    return this.storage[idx];
  }

  async findById(id: string): Promise<ElevationRequest | null> {
    return this.storage.find((entry) => entry.id === id) ?? null;
  }

  async findActiveForUser(query: ElevationQueryInput, now: Date): Promise<ElevationRequest | null> {
    return (
      this.storage.find(
        (entry) =>
          entry.requesterId === query.userId &&
          entry.organizationId === query.organizationId &&
          entry.status === 'approved' &&
          (!entry.expiresAt || entry.expiresAt > now) &&
          (entry.scopeType === 'organization' || entry.workspaceId === query.workspaceId),
      ) ?? null
    );
  }

  async findExpired(now: Date): Promise<ElevationRequest[]> {
    return this.storage.filter((entry) => entry.status === 'approved' && entry.expiresAt && entry.expiresAt <= now);
  }
}

export function toActiveElevation(request: ElevationRequest): ActiveElevation {
  if (!request.effectiveFrom || !request.expiresAt || !request.elevatedToRole)
    throw new Error('Cannot convert non-active elevation');
  return {
    requestId: request.id,
    userId: request.requesterId,
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
    elevatedToRole: request.elevatedToRole,
    effectiveFrom: request.effectiveFrom,
    expiresAt: request.expiresAt,
  };
}
